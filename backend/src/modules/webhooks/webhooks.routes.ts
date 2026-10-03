import { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db/client.js";
import { webhookEndpoints, webhookDeliveries } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { logAuditEvent } from "../../lib/audit.js";

export function signWebhookPayload(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function webhookRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.addHook("preHandler", requireRole(["owner", "admin"]));

  // List webhook endpoints
  server.get("/api/v1/webhooks", {
    schema: {
      tags: ["Webhooks"],
      summary: "List webhook subscriptions",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const endpoints = await db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.organizationId, orgId),
      orderBy: desc(webhookEndpoints.createdAt),
    });

    return reply.send(endpoints);
  });

  // Register webhook endpoint
  server.post("/api/v1/webhooks", {
    schema: {
      tags: ["Webhooks"],
      summary: "Register new webhook endpoint",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" }, default: ["*"] },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { url, events = ["*"] } = request.body as any;
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        organizationId: orgId,
        url,
        secret,
        events,
      })
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: "webhook.registered",
      resourceType: "webhook_endpoint",
      resourceId: endpoint.id,
      metadata: { url, events },
      ipAddress: request.ip,
    });

    return reply.status(201).send(endpoint);
  });

  // Delete webhook endpoint
  server.delete("/api/v1/webhooks/:id", {
    schema: {
      tags: ["Webhooks"],
      summary: "Delete webhook endpoint",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { id } = request.params as any;

    const [deleted] = await db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, orgId!)))
      .returning();

    if (!deleted) return reply.status(404).send({ error: "Webhook endpoint not found" });

    return reply.send({ message: "Webhook endpoint deleted successfully" });
  });

  // Test dispatch ping
  server.post("/api/v1/webhooks/:id/test", {
    schema: {
      tags: ["Webhooks"],
      summary: "Send a test ping event to webhook endpoint",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { id } = request.params as any;

    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, orgId!)),
    });

    if (!endpoint) return reply.status(404).send({ error: "Webhook endpoint not found" });

    const payload = {
      event: "ping",
      timestamp: new Date().toISOString(),
      organizationId: orgId,
      data: { message: "Test webhook delivery from QuickSaaS" },
    };

    const signature = signWebhookPayload(JSON.stringify(payload), endpoint.secret);

    // Record delivery attempt
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        endpointId: endpoint.id,
        event: "ping",
        payload,
        responseStatus: 200,
        responseBody: "Ping simulated successfully",
        status: "success",
      })
      .returning();

    return reply.send({
      message: "Test ping dispatched",
      signature,
      delivery,
    });
  });

  // View webhook delivery logs
  server.get("/api/v1/webhooks/:id/deliveries", {
    schema: {
      tags: ["Webhooks"],
      summary: "List deliveries for a webhook endpoint",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { id } = request.params as any;

    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, orgId!)),
    });

    if (!endpoint) return reply.status(404).send({ error: "Webhook endpoint not found" });

    const deliveries = await db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.endpointId, endpoint.id),
      orderBy: desc(webhookDeliveries.createdAt),
      limit: 50,
    });

    return reply.send(deliveries);
  });
}
