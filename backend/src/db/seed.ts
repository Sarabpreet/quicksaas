import { db } from "./client.js";
import {
  users,
  organizations,
  memberships,
  apiKeys,
  emailTemplates,
  featureFlags,
  resourceDefinitions,
  dynamicEntities,
  subscriptions,
  invoices,
} from "./schema/index.js";
import { hashPassword } from "../lib/crypto.js";
import crypto from "node:crypto";

export async function seedDatabase() {
  console.log("[Seed] Starting database seed...");

  // 1. Superadmin User
  const saEmail = process.env.INITIAL_SUPERADMIN_EMAIL || "superadmin@quicksaas.dev";
  const saPassword = process.env.INITIAL_SUPERADMIN_PASSWORD || "AdminPass123!";
  const superadminPass = hashPassword(saPassword);
  const [superadmin] = await db
    .insert(users)
    .values({
      email: saEmail,
      passwordHash: superadminPass,
      name: process.env.INITIAL_SUPERADMIN_NAME || "Platform Superadmin",
      isSuperadmin: true,
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  // 2. Demo User (Founder)
  const founderEmail = process.env.INITIAL_FOUNDER_EMAIL || "founder@startup.io";
  const founderPassword = process.env.INITIAL_FOUNDER_PASSWORD || "StartupPass123!";
  const founderPass = hashPassword(founderPassword);
  const [founder] = await db
    .insert(users)
    .values({
      email: founderEmail,
      passwordHash: founderPass,
      name: "Alex Founder",
      isSuperadmin: false,
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  // 3. Demo Viewer User
  const viewerPass = hashPassword("ViewerPass123!");
  const [viewer] = await db
    .insert(users)
    .values({
      email: "viewer@startup.io",
      passwordHash: viewerPass,
      name: "Sam Viewer",
      isSuperadmin: false,
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  const alexId = founder?.id || (await db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, founderEmail) }))!.id;
  const samId = viewer?.id || (await db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, "viewer@startup.io") }))!.id;

  // 4. Demo Organization
  const orgName = process.env.INITIAL_ORG_NAME || "Startup Labs";
  const orgSlug = process.env.INITIAL_ORG_SLUG || "startup-labs";
  let org = await db.query.organizations.findFirst({
    where: (o: any, { eq }: any) => eq(o.slug, orgSlug),
  });

  if (!org) {
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug: orgSlug,
      })
      .returning();
    org = newOrg;
  }

  // 5. Memberships
  await db
    .insert(memberships)
    .values([
      { organizationId: org.id, userId: alexId, role: "owner" },
      { organizationId: org.id, userId: samId, role: "viewer" },
    ])
    .onConflictDoNothing();

  // 6. Demo API Key
  const rawKey = "qs_live_seed_1234567890abcdef";
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  await db
    .insert(apiKeys)
    .values({
      organizationId: org.id,
      name: "Default Live Key",
      keyPrefix: "qs_live_seed",
      keyHash,
    })
    .onConflictDoNothing();

  // 7. Email Templates
  await db
    .insert(emailTemplates)
    .values([
      {
        name: "welcome_user",
        subject: "Welcome to QuickSaaS, {{name}}!",
        bodyHtml: "<h1>Welcome aboard!</h1><p>Hi {{name}}, your account has been created.</p>",
        bodyText: "Hi {{name}}, your account has been created.",
        variables: ["name", "email"],
      },
      {
        name: "team_invite",
        subject: "You've been invited to join {{orgName}}",
        bodyHtml: "<p>You have been invited to join {{orgName}} as a {{role}}.</p><a href='{{inviteLink}}'>Accept Invite</a>",
        bodyText: "You have been invited to join {{orgName}}. Visit: {{inviteLink}}",
        variables: ["orgName", "role", "inviteLink"],
      },
    ])
    .onConflictDoNothing();

  // 8. Feature Flags
  await db
    .insert(featureFlags)
    .values([
      {
        key: "ai_assistant",
        name: "AI Copilot Assistant",
        description: "Enables generative assistant features in customer app",
        isEnabled: true,
      },
      {
        organizationId: org.id,
        key: "beta_analytics",
        name: "Beta Analytics Dashboard",
        description: "Advanced cohort retention analytics",
        isEnabled: false,
      },
    ])
    .onConflictDoNothing();

  // 9. API Studio Sample Resource: Customer
  let customerRes = await db.query.resourceDefinitions.findFirst({
    where: (r: any, { eq, and }: any) => and(eq(r.organizationId, org.id), eq(r.slug, "customers")),
  });

  if (!customerRes) {
    const [res] = await db
      .insert(resourceDefinitions)
      .values({
        organizationId: org.id,
        name: "Customer",
        slug: "customers",
        description: "Enterprise CRM customers",
        isPublished: true,
        fields: [
          { name: "fullName", type: "text", required: true },
          { name: "email", type: "text", required: true },
          { name: "plan", type: "text", defaultValue: "starter" },
          { name: "mrr", type: "number", defaultValue: 99 },
          { name: "active", type: "boolean", defaultValue: true },
        ],
      })
      .returning();
    customerRes = res;

    // Insert sample records
    await db.insert(dynamicEntities).values([
      {
        organizationId: org.id,
        resourceId: customerRes.id,
        data: {
          fullName: "Erlich Bachman",
          email: "erlich@aviato.com",
          plan: "enterprise",
          mrr: 999,
          active: true,
        },
      },
      {
        organizationId: org.id,
        resourceId: customerRes.id,
        data: {
          fullName: "Richard Hendricks",
          email: "richard@piedpiper.com",
          plan: "pro",
          mrr: 299,
          active: true,
        },
      },
    ]);
  }

  // 10. Seed Subscription & Invoice
  const existingSub = await db.query.subscriptions.findFirst({
    where: (s: any, { eq }: any) => eq(s.organizationId, org.id),
  });

  if (!existingSub) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(subscriptions).values({
      organizationId: org.id,
      plan: "pro",
      status: "active",
      stripePriceId: "price_pro_monthly_49",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    await db.insert(invoices).values({
      organizationId: org.id,
      stripeInvoiceId: "in_seed_initial_pro",
      amountDue: 4900,
      amountPaid: 4900,
      currency: "usd",
      status: "paid",
      paidAt: now,
    });
  }

  console.log("[Seed] ✅ Database seeded successfully!");
  console.log("--------------------------------------------------");
  console.log("Superadmin: superadmin@quicksaas.dev / AdminPass123!");
  console.log("Founder:    founder@startup.io / StartupPass123!");
  console.log("Viewer:     viewer@startup.io / ViewerPass123!");
  console.log("Demo API Key: qs_live_seed_1234567890abcdef");
  console.log("--------------------------------------------------");
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed] ❌ Failed to seed database:", err);
      process.exit(1);
    });
}
