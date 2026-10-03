import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  subscriptions,
  invoices,
  organizations,
} from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { logAuditEvent } from "../../lib/audit.js";
import {
  stripeClient,
  getAllPlans,
  getPlanConfig,
  getOrCreateSubscription,
  getOrganizationUsage,
} from "../../lib/stripe.js";

export async function billingRoutes(server: FastifyInstance) {
  // 1. Get available plans (Public or Authenticated)
  server.get("/api/v1/billing/plans", {
    schema: {
      tags: ["Billing"],
      summary: "List all available subscription plans and limits",
    },
  }, async (_request, reply) => {
    return reply.send({
      plans: getAllPlans(),
    });
  });

  // 2. Get current organization's subscription & usage details
  server.get("/api/v1/billing/subscription", {
    preHandler: [authenticate],
    schema: {
      tags: ["Billing"],
      summary: "Get active subscription, plan details, usage metrics and limits",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const sub = await getOrCreateSubscription(orgId);
    const plan = getPlanConfig(sub.plan);
    const usage = await getOrganizationUsage(orgId);

    const recentInvoices = await db.query.invoices.findMany({
      where: eq(invoices.organizationId, orgId),
      orderBy: desc(invoices.createdAt),
      limit: 5,
    });

    return reply.send({
      subscription: sub,
      plan,
      usage,
      limits: {
        maxMembers: plan.maxMembers,
        maxResources: plan.maxResources,
        maxStorageBytes: plan.maxStorageBytes,
        maxApiKeys: plan.maxApiKeys,
      },
      recentInvoices,
    });
  });

  // 3. Create Stripe Checkout Session (or Simulated Checkout)
  server.post("/api/v1/billing/checkout", {
    preHandler: [authenticate, requireRole(["owner", "admin"])],
    schema: {
      tags: ["Billing"],
      summary: "Initiate subscription checkout session",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["plan"],
        properties: {
          plan: { type: "string", enum: ["free", "pro", "enterprise"] },
          successUrl: { type: "string" },
          cancelUrl: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId!;
    const { plan: targetPlan, successUrl, cancelUrl } = request.body as any;

    const planConfig = getPlanConfig(targetPlan);
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) return reply.status(404).send({ error: "Organization not found" });

    const currentSub = await getOrCreateSubscription(orgId);

    // If Stripe is configured and live keys exist, call Stripe API
    if (stripeClient && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("mock_")) {
      try {
        let customerId = currentSub.stripeCustomerId;
        if (!customerId) {
          const customer = await stripeClient.customers.create({
            name: org.name,
            metadata: { organizationId: org.id },
          });
          customerId = customer.id;
          await db
            .update(subscriptions)
            .set({ stripeCustomerId: customerId, updatedAt: new Date() })
            .where(eq(subscriptions.id, currentSub.id));
        }

        const session = await stripeClient.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: planConfig.stripePriceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: successUrl || `${request.headers.origin || "http://localhost:3001"}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || `${request.headers.origin || "http://localhost:3001"}/settings/billing?canceled=true`,
          metadata: {
            organizationId: org.id,
            plan: targetPlan,
          },
        });

        return reply.send({
          checkoutUrl: session.url,
          sessionId: session.id,
          mode: "stripe",
        });
      } catch (err: any) {
        request.log.error(err, "Stripe checkout session creation failed");
        return reply.status(500).send({ error: "Stripe error: " + err.message });
      }
    }

    // Local Development / Simulated Checkout fallback
    const simulatedSessionId = `mock_cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const checkoutUrl = `${request.headers.origin || "http://localhost:3001"}/settings/billing?session_id=${simulatedSessionId}&plan=${targetPlan}`;

    return reply.send({
      checkoutUrl,
      sessionId: simulatedSessionId,
      mode: "simulated",
      message: "Simulated Stripe Checkout session created for local development",
    });
  });

  // 4. Create Stripe Customer Portal Session
  server.post("/api/v1/billing/portal", {
    preHandler: [authenticate, requireRole(["owner", "admin"])],
    schema: {
      tags: ["Billing"],
      summary: "Create Stripe billing customer portal session",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          returnUrl: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId!;
    const { returnUrl } = (request.body || {}) as any;
    const sub = await getOrCreateSubscription(orgId);

    if (stripeClient && sub.stripeCustomerId && !process.env.STRIPE_SECRET_KEY?.startsWith("mock_")) {
      try {
        const portal = await stripeClient.billingPortal.sessions.create({
          customer: sub.stripeCustomerId,
          return_url: returnUrl || `${request.headers.origin || "http://localhost:3001"}/settings/billing`,
        });

        return reply.send({ url: portal.url, mode: "stripe" });
      } catch (err: any) {
        return reply.status(500).send({ error: "Stripe portal error: " + err.message });
      }
    }

    return reply.send({
      url: `${request.headers.origin || "http://localhost:3001"}/settings/billing?portal_simulated=true`,
      mode: "simulated",
      message: "Simulated customer billing portal session",
    });
  });

  // 5. List organization invoices / billing history
  server.get("/api/v1/billing/invoices", {
    preHandler: [authenticate, requireRole(["owner", "admin"])],
    schema: {
      tags: ["Billing"],
      summary: "List invoices and billing history for organization",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId!;
    const list = await db.query.invoices.findMany({
      where: eq(invoices.organizationId, orgId),
      orderBy: desc(invoices.createdAt),
      limit: 20,
    });

    return reply.send({ invoices: list });
  });

  // 6. Direct Plan Upgrade / Simulation Endpoint (for Testing and Local Dev)
  server.post("/api/v1/billing/simulate-upgrade", {
    preHandler: [authenticate, requireRole(["owner", "admin"])],
    schema: {
      tags: ["Billing"],
      summary: "Simulate instant plan change for local development & testing",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["plan"],
        properties: {
          plan: { type: "string", enum: ["free", "pro", "enterprise"] },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId!;
    const { plan: targetPlan } = request.body as any;
    const planConfig = getPlanConfig(targetPlan);

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub = await getOrCreateSubscription(orgId);

    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        plan: targetPlan,
        status: "active",
        stripePriceId: planConfig.stripePriceId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.id))
      .returning();

    // Create corresponding simulated invoice if paid plan
    if (planConfig.priceMonthly > 0) {
      await db.insert(invoices).values({
        organizationId: orgId,
        stripeInvoiceId: `in_sim_${Date.now()}`,
        amountDue: planConfig.priceMonthly * 100,
        amountPaid: planConfig.priceMonthly * 100,
        currency: "usd",
        status: "paid",
        paidAt: now,
      });
    }

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: "billing.plan_updated",
      resourceType: "subscription",
      resourceId: updatedSub.id,
      metadata: { oldPlan: sub.plan, newPlan: targetPlan },
      ipAddress: request.ip,
    });

    return reply.send({
      message: `Organization successfully upgraded to ${planConfig.name}`,
      subscription: updatedSub,
      plan: planConfig,
    });
  });

  // 7. Stripe Webhook Receiver
  server.post("/api/v1/billing/webhook", {
    schema: {
      tags: ["Billing"],
      summary: "Stripe Webhook handler",
    },
  }, async (request, reply) => {
    const sig = request.headers["stripe-signature"] as string | undefined;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (stripeClient && endpointSecret && sig) {
      try {
        const rawBody = (request as any).rawBody || JSON.stringify(request.body);
        event = stripeClient.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err: any) {
        request.log.warn(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
      }
    } else {
      // Allow testing webhook payload in dev/test mode without signature requirement
      event = request.body;
    }

    if (!event || !event.type) {
      return reply.status(400).send({ error: "Missing event payload" });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.organizationId;
        const targetPlan = session.metadata?.plan || "pro";

        if (orgId) {
          const planConfig = getPlanConfig(targetPlan);
          const now = new Date();
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await db
            .update(subscriptions)
            .set({
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              plan: targetPlan,
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              updatedAt: now,
            })
            .where(eq(subscriptions.organizationId, orgId));

          await logAuditEvent({
            organizationId: orgId,
            action: "billing.checkout_completed",
            resourceType: "subscription",
            metadata: { plan: targetPlan, stripeSessionId: session.id },
            ipAddress: request.ip,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const status = sub.status;
        const periodStart = new Date(sub.current_period_start * 1000);
        const periodEnd = new Date(sub.current_period_end * 1000);
        const cancelAtPeriodEnd = sub.cancel_at_period_end || false;

        await db
          .update(subscriptions)
          .set({
            status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;

        await db
          .update(subscriptions)
          .set({
            plan: "free",
            status: "canceled",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeCustomerId, customerId),
        });

        if (sub) {
          await db.insert(invoices).values({
            organizationId: sub.organizationId,
            stripeInvoiceId: invoice.id,
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            invoicePdf: invoice.hosted_invoice_url || invoice.invoice_pdf || null,
            paidAt: new Date(),
          });
        }
        break;
      }
    }

    return reply.send({ received: true });
  });
}
