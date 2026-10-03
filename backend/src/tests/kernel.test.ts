import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../server.js";
import { runMigrations } from "../db/migrate.js";
import { redis } from "../redis/client.js";
import { rawClient } from "../db/client.js";
import { FastifyInstance } from "fastify";

let app: FastifyInstance;

// State across tests
let superadminToken: string;
let founderToken: string;
let viewerToken: string;
let orgAId: string;
let orgBToken: string;
let orgBId: string;
let customerResourceId: string;
let createdCustomerId: string;
let apiKeyId: string;
let rawApiKey: string;
let fileId: string;
let webhookId: string;
let jobId: string;

describe("QuickSaaS Kernel End-to-End Verification Suite", () => {
  before(async () => {
    await runMigrations();
    app = await buildServer();
    await app.ready();
  });

  // 1. System Health
  test("1. Health check returns 200 and healthy database/redis", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, "healthy");
    assert.equal(body.database.status, "healthy");
  });

  // 2. Auth & Registration
  test("2. Register Org A (Owner) and Org B (Tenant isolation test)", async () => {
    // Org A
    const resA = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: `alice_${Date.now()}@acme.corp`,
        password: "Password123!",
        name: "Alice Owner",
        organizationName: "Acme Corp",
      },
    });
    assert.equal(resA.statusCode, 201);
    const bodyA = JSON.parse(resA.body);
    founderToken = bodyA.token;
    orgAId = bodyA.organization.id;

    // Org B
    const resB = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: `bob_${Date.now()}@beta.io`,
        password: "Password123!",
        name: "Bob Beta",
        organizationName: "Beta Systems",
      },
    });
    assert.equal(resB.statusCode, 201);
    const bodyB = JSON.parse(resB.body);
    orgBToken = bodyB.token;
    orgBId = bodyB.organization.id;
  });

  // 3. User Invitation & Role Assignment
  test("3. Invite a Viewer user and verify role", async () => {
    const inviteRes = await app.inject({
      method: "POST",
      url: `/api/v1/organizations/${orgAId}/invites`,
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        email: `viewer_${Date.now()}@acme.corp`,
        role: "viewer",
      },
    });
    assert.equal(inviteRes.statusCode, 201);
    const inviteBody = JSON.parse(inviteRes.body);
    const token = inviteBody.invite.token;

    // Register viewer user
    const viewerEmail = `viewer_user_${Date.now()}@acme.corp`;
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: viewerEmail,
        password: "Password123!",
        name: "Victor Viewer",
      },
    });
    viewerToken = JSON.parse(regRes.body).token;

    // Accept invite
    const acceptRes = await app.inject({
      method: "POST",
      url: `/api/v1/organizations/invites/${token}/accept`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(acceptRes.statusCode, 200);
  });

  // 4. API Studio - Define Resource
  test("4. Define a dynamic Customer resource without code", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/resources",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        name: "Customer",
        slug: "customers",
        description: "B2B client accounts",
        fields: [
          { name: "company", type: "text", required: true },
          { name: "arr", type: "number", defaultValue: 0 },
          { name: "isVerified", type: "boolean", defaultValue: false },
        ],
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    customerResourceId = body.id;
    assert.equal(body.slug, "customers");
  });

  // 5. Dynamic CRUD Runtime
  test("5. Dynamic CRUD: Create and retrieve records", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/data/customers",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        company: "Stripe Inc",
        arr: 150000,
        isVerified: true,
      },
    });
    assert.equal(createRes.statusCode, 201);
    const created = JSON.parse(createRes.body);
    createdCustomerId = created.id;
    assert.equal(created.company, "Stripe Inc");
    assert.equal(created.arr, 150000);

    // List records
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/data/customers",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(listRes.statusCode, 200);
    const listBody = JSON.parse(listRes.body);
    assert.equal(listBody.total, 1);
  });

  // 6. Tenant Isolation (Critical Scenario #3)
  test("6. Tenant Isolation: Org B cannot access Org A records", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/data/customers/${createdCustomerId}`,
      headers: { authorization: `Bearer ${orgBToken}` },
    });
    // Should be 404 because customers resource doesn't even exist in Org B
    assert.equal(res.statusCode, 404);
  });

  // 7. RBAC Protection (Critical Scenario #4)
  test("7. RBAC: Viewer cannot perform write operations", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/data/customers",
      headers: {
        authorization: `Bearer ${viewerToken}`,
        "x-organization-id": orgAId,
      },
      payload: {
        company: "Malicious Injection",
      },
    });
    assert.equal(res.statusCode, 403);
  });

  // 8. API Key Generation and Revocation (Critical Scenario #9)
  test("8. API Key creation, auth via X-API-Key, and revocation", async () => {
    // Generate key
    const createKeyRes = await app.inject({
      method: "POST",
      url: "/api/v1/api-keys",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: { name: "CI Automation Key", expiresInDays: 30 },
    });
    assert.equal(createKeyRes.statusCode, 201);
    const keyData = JSON.parse(createKeyRes.body);
    apiKeyId = keyData.id;
    rawApiKey = keyData.apiKey;
    assert.ok(rawApiKey.startsWith("qs_live_"));

    // Authenticate using X-API-Key header
    const authKeyRes = await app.inject({
      method: "GET",
      url: "/api/v1/data/customers",
      headers: { "x-api-key": rawApiKey },
    });
    assert.equal(authKeyRes.statusCode, 200);

    // Revoke key
    const revokeRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/api-keys/${apiKeyId}`,
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(revokeRes.statusCode, 200);

    // Revoked key blocked
    const blockedRes = await app.inject({
      method: "GET",
      url: "/api/v1/data/customers",
      headers: { "x-api-key": rawApiKey },
    });
    assert.equal(blockedRes.statusCode, 401);
  });

  // 9. Files & Storage (Critical Scenario #5)
  test("9. Files upload, metadata, and download streaming", async () => {
    const fileContent = Buffer.from("QuickSaaS Enterprise Test Document").toString("base64");
    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/files",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        filename: "invoice_2026.pdf",
        mimeType: "application/pdf",
        contentBase64: fileContent,
        isPublic: false,
      },
    });
    assert.equal(uploadRes.statusCode, 201);
    const fileData = JSON.parse(uploadRes.body);
    fileId = fileData.id;

    // Download content
    const dlRes = await app.inject({
      method: "GET",
      url: `/api/v1/files/${fileId}/download`,
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgAId,
      },
    });
    assert.equal(dlRes.statusCode, 200);
    assert.equal(dlRes.body, "QuickSaaS Enterprise Test Document");
  });

  // 10. Transactional Email
  test("10. Transactional Email template preview & dispatch", async () => {
    // Template preview
    const prevRes = await app.inject({
      method: "POST",
      url: "/api/v1/email/preview",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        templateName: "welcome_user",
        variables: { name: "Alice", email: "alice@acme.corp" },
      },
    });
    assert.equal(prevRes.statusCode, 200);
    const prevBody = JSON.parse(prevRes.body);
    assert.ok(prevBody.renderedSubject.includes("Alice"));

    // Send email
    const sendRes = await app.inject({
      method: "POST",
      url: "/api/v1/email/send",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        to: "alice@acme.corp",
        templateName: "welcome_user",
        variables: { name: "Alice" },
      },
    });
    assert.equal(sendRes.statusCode, 201);
  });

  // 11. In-App Notifications
  test("11. In-app notifications creation, listing, and read marking", async () => {
    // Get founder userId
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    const userId = JSON.parse(meRes.body).user.id;

    // Create notification
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/notifications",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        targetUserId: userId,
        title: "Welcome!",
        message: "Your organization is set up.",
        type: "success",
      },
    });
    assert.equal(createRes.statusCode, 201);
    const notifId = JSON.parse(createRes.body).id;

    // List notifications
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(listRes.statusCode, 200);
    const listBody = JSON.parse(listRes.body);
    assert.ok(listBody.total >= 1);

    // Mark read
    const readRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/notifications/${notifId}/read`,
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(readRes.statusCode, 200);
  });

  // 12. Webhooks & HMAC Signatures (Critical Scenario #8)
  test("12. Webhook registration, HMAC ping dispatch, and deliveries", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        url: "https://api.external.com/webhooks",
        events: ["customer.created", "ping"],
      },
    });
    assert.equal(regRes.statusCode, 201);
    const wh = JSON.parse(regRes.body);
    webhookId = wh.id;
    assert.ok(wh.secret.startsWith("whsec_"));

    // Test ping dispatch
    const pingRes = await app.inject({
      method: "POST",
      url: `/api/v1/webhooks/${webhookId}/test`,
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(pingRes.statusCode, 200);
    const pingData = JSON.parse(pingRes.body);
    assert.ok(pingData.signature.startsWith("sha256="));
    assert.equal(pingData.delivery.status, "success");
  });

  // 13. Jobs & Worker Queue (Critical Scenario #7)
  test("13. Jobs: Enqueue, process-next worker, and retry", async () => {
    // Enqueue
    const qRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs/enqueue",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        name: "export_customers_csv",
        payload: { format: "csv" },
      },
    });
    assert.equal(qRes.statusCode, 201);
    jobId = JSON.parse(qRes.body).id;

    // Worker process
    const procRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs/worker/process-next",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(procRes.statusCode, 200);

    // Retry job
    const retryRes = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${jobId}/retry`,
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(retryRes.statusCode, 200);
    assert.equal(JSON.parse(retryRes.body).job.status, "pending");
  });

  // 14. Feature Flags Evaluation
  test("14. Feature flags evaluation for client apps", async () => {
    const evalRes = await app.inject({
      method: "GET",
      url: "/api/v1/feature-flags/evaluate",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(evalRes.statusCode, 200);
    const flags = JSON.parse(evalRes.body).flags;
    assert.equal(flags.ai_assistant, true);
  });

  // 15. Settings Key-Value Engine
  test("15. Org Settings: Put and Get", async () => {
    const putRes = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/theme",
      headers: { authorization: `Bearer ${founderToken}` },
      payload: { value: { mode: "dark", primaryColor: "#6366f1" } },
    });
    assert.ok(putRes.statusCode === 200 || putRes.statusCode === 201);

    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/settings/theme",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    assert.equal(JSON.parse(getRes.body).value.mode, "dark");
  });

  // 16. Audit Log Recording (Critical Scenario #8)
  test("16. Audit logs captured actor actions", async () => {
    const auditRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs",
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(auditRes.statusCode, 200);
    const body = JSON.parse(auditRes.body);
    assert.ok(body.total > 0);
  });

  // 17. Resource Engine Promotion to Code (Critical Scenario #10)
  test("17. Promote resource generates TypeScript Drizzle schema blueprint", async () => {
    const promoteRes = await app.inject({
      method: "POST",
      url: `/api/v1/resources/${customerResourceId}/promote`,
      headers: { authorization: `Bearer ${founderToken}` },
    });
    assert.equal(promoteRes.statusCode, 200);
    const body = JSON.parse(promoteRes.body);
    assert.ok(body.generatedSchema.includes('export const customers = pgTable("customers"'));
    assert.ok(body.destinationHint.includes("src/modules/customers/customers.schema.ts"));
  });

  // 18. Superadmin Global Stats (Admin Operations)
  test("18. Superadmin global platform statistics", async () => {
    // Login as seeded superadmin
    const saLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "superadmin@quicksaas.dev",
        password: "AdminPass123!",
      },
    });
    assert.equal(saLoginRes.statusCode, 200);
    superadminToken = JSON.parse(saLoginRes.body).token;

    const statsRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/stats",
      headers: { authorization: `Bearer ${superadminToken}` },
    });
    assert.equal(statsRes.statusCode, 200);
    const stats = JSON.parse(statsRes.body);
    assert.ok(stats.totalOrganizations >= 2);
    assert.ok(stats.totalUsers >= 2);
  });

  test("19. Billing: Plans, subscription info, simulated checkout & upgrade", async () => {
    // 1. List available plans
    const plansRes = await app.inject({
      method: "GET",
      url: "/api/v1/billing/plans",
    });
    assert.equal(plansRes.statusCode, 200);
    const { plans } = JSON.parse(plansRes.body);
    assert.equal(plans.length, 3);
    assert.ok(plans.some((p: any) => p.id === "free"));
    assert.ok(plans.some((p: any) => p.id === "pro"));
    assert.ok(plans.some((p: any) => p.id === "enterprise"));

    // 2. Fetch current subscription & usage
    const subRes = await app.inject({
      method: "GET",
      url: "/api/v1/billing/subscription",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgAId,
      },
    });
    assert.equal(subRes.statusCode, 200);
    const subData = JSON.parse(subRes.body);
    assert.ok(subData.subscription);
    assert.ok(subData.usage);
    assert.ok(subData.limits);

    // 3. Initiate checkout session
    const checkoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/billing/checkout",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgAId,
      },
      payload: { plan: "pro" },
    });
    assert.equal(checkoutRes.statusCode, 200);
    const checkoutData = JSON.parse(checkoutRes.body);
    assert.ok(checkoutData.checkoutUrl);

    // 4. Simulate upgrade to enterprise
    const upgradeRes = await app.inject({
      method: "POST",
      url: "/api/v1/billing/simulate-upgrade",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgAId,
      },
      payload: { plan: "enterprise" },
    });
    assert.equal(upgradeRes.statusCode, 200);
    const upgradeData = JSON.parse(upgradeRes.body);
    assert.equal(upgradeData.subscription.plan, "enterprise");
    assert.equal(upgradeData.plan.priceMonthly, 199);

    // 5. Invoices list check
    const invRes = await app.inject({
      method: "GET",
      url: "/api/v1/billing/invoices",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgAId,
      },
    });
    assert.equal(invRes.statusCode, 200);
    const invData = JSON.parse(invRes.body);
    assert.ok(invData.invoices.length > 0);
  });

  test("20. Billing: Stripe Webhook handling & plan entitlement checks", async () => {
    // 1. Send simulated Stripe webhook checkout.session.completed
    const webhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhook",
      payload: {
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_mock",
            customer: "cus_mock_999",
            subscription: "sub_mock_999",
            metadata: {
              organizationId: orgAId,
              plan: "pro",
            },
          },
        },
      },
    });
    assert.equal(webhookRes.statusCode, 200);
    assert.deepEqual(JSON.parse(webhookRes.body), { received: true });

    // Verify subscription updated to pro via webhook
    const verifySub = await app.inject({
      method: "GET",
      url: "/api/v1/billing/subscription",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgAId,
      },
    });
    assert.equal(verifySub.statusCode, 200);
    const currentSub = JSON.parse(verifySub.body);
    assert.equal(currentSub.subscription.plan, "pro");
    assert.equal(currentSub.subscription.stripeCustomerId, "cus_mock_999");
  });

  test("21. Disaster Recovery: Backup generation, checksum verification, mutation & clean restore", async () => {
    // 1. Create on-demand backup snapshot
    const createBkpRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/backups",
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        label: "Kernel Automated Test Snapshot",
      },
    });
    assert.equal(createBkpRes.statusCode, 201);
    const bkpData = JSON.parse(createBkpRes.body);
    assert.ok(bkpData.backup.id.startsWith("bkp_"));
    assert.ok(bkpData.backup.sha256);
    assert.ok(bkpData.backup.tablesSummary.users > 0);
    const backupId = bkpData.backup.id;

    // 2. List backups and verify present
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/backups",
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });
    assert.equal(listRes.statusCode, 200);
    const listData = JSON.parse(listRes.body);
    assert.ok(listData.backups.some((b: any) => b.id === backupId));

    // 3. Verify archive checksum and integrity
    const verifyRes = await app.inject({
      method: "POST",
      url: `/api/v1/admin/backups/${backupId}/verify`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });
    assert.equal(verifyRes.statusCode, 200);
    const verifyData = JSON.parse(verifyRes.body);
    assert.equal(verifyData.valid, true);
    assert.equal(verifyData.actualSha256, bkpData.backup.sha256);

    // 4. Restore backup snapshot
    const restoreRes = await app.inject({
      method: "POST",
      url: `/api/v1/admin/backups/${backupId}/restore`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });
    assert.equal(restoreRes.statusCode, 200);
    const restoreData = JSON.parse(restoreRes.body);
    assert.equal(restoreData.result.success, true);
    assert.equal(restoreData.result.verification.databaseReachable, true);
  });

  // 22. Plan Entitlements: Capacity Quotas and Upgrade Unblocking
  test("22. Plan Entitlements: Enforces capacity limits on Free plan and unblocks after upgrade", async () => {
    // Org B starts on Free plan (maxApiKeys = 2)
    // Create Key 1
    const key1 = await app.inject({
      method: "POST",
      url: "/api/v1/api-keys",
      headers: { authorization: `Bearer ${orgBToken}`, "x-organization-id": orgBId },
      payload: { name: "Key 1" },
    });
    assert.equal(key1.statusCode, 201);

    // Create Key 2
    const key2 = await app.inject({
      method: "POST",
      url: "/api/v1/api-keys",
      headers: { authorization: `Bearer ${orgBToken}`, "x-organization-id": orgBId },
      payload: { name: "Key 2" },
    });
    assert.equal(key2.statusCode, 201);

    // Attempt Key 3 -> Should be blocked with HTTP 403 PLAN_LIMIT_EXCEEDED
    const key3Blocked = await app.inject({
      method: "POST",
      url: "/api/v1/api-keys",
      headers: { authorization: `Bearer ${orgBToken}`, "x-organization-id": orgBId },
      payload: { name: "Key 3 Exceed" },
    });
    assert.equal(key3Blocked.statusCode, 403);
    const blockedBody = JSON.parse(key3Blocked.body);
    assert.equal(blockedBody.limitExceeded, true);
    assert.equal(blockedBody.metric, "api_keys");

    // Upgrade Org B to Pro plan (maxApiKeys = 15)
    const upgradeRes = await app.inject({
      method: "POST",
      url: "/api/v1/billing/simulate-upgrade",
      headers: { authorization: `Bearer ${orgBToken}`, "x-organization-id": orgBId },
      payload: { plan: "pro" },
    });
    assert.equal(upgradeRes.statusCode, 200);

    // Retry Key 3 -> Now allowed!
    const key3Allowed = await app.inject({
      method: "POST",
      url: "/api/v1/api-keys",
      headers: { authorization: `Bearer ${orgBToken}`, "x-organization-id": orgBId },
      payload: { name: "Key 3 Allowed" },
    });
    assert.equal(key3Allowed.statusCode, 201);
  });

  // 23. File Storage Security: Cross-Tenant Isolation and 404 Handling
  test("23. File Storage Security: Cross-tenant private file download blocked (403) and 404 on missing file", async () => {
    // Org B user attempts to download private file from Org A
    const crossDl = await app.inject({
      method: "GET",
      url: `/api/v1/files/${fileId}/download`,
      headers: {
        authorization: `Bearer ${orgBToken}`,
        "x-organization-id": orgBId,
      },
    });
    assert.equal(crossDl.statusCode, 403);

    // Superadmin can download file
    const superDl = await app.inject({
      method: "GET",
      url: `/api/v1/files/${fileId}/download`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });
    assert.equal(superDl.statusCode, 200);

    // Missing file returns 404
    const missingDl = await app.inject({
      method: "GET",
      url: `/api/v1/files/00000000-0000-0000-0000-000000000000/download`,
      headers: {
        authorization: `Bearer ${founderToken}`,
      },
    });
    assert.equal(missingDl.statusCode, 404);
  });

  // 24. Dynamic Resource Engine: Field Validation and Record Deletion
  test("24. Dynamic Resource Engine: Field validation errors and record deletion", async () => {
    // Missing required field 'company'
    const invalidReq = await app.inject({
      method: "POST",
      url: "/api/v1/data/customers",
      headers: { authorization: `Bearer ${founderToken}`, "x-organization-id": orgAId },
      payload: {
        arr: 50000,
      },
    });
    assert.equal(invalidReq.statusCode, 422);

    // Delete existing record created in test 5
    const delRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/data/customers/${createdCustomerId}`,
      headers: { authorization: `Bearer ${founderToken}`, "x-organization-id": orgAId },
    });
    assert.equal(delRes.statusCode, 200);

    // Verify record is gone (404)
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/data/customers/${createdCustomerId}`,
      headers: { authorization: `Bearer ${founderToken}`, "x-organization-id": orgAId },
    });
    assert.equal(getRes.statusCode, 404);
  });

  // 25. Disaster Recovery Edge Cases
  test("25. Disaster Recovery: Rejects invalid snapshot IDs and supports snapshot deletion", async () => {
    // Non-existent verify returns 404
    const invVerify = await app.inject({
      method: "POST",
      url: "/api/v1/admin/backups/non-existent-id/verify",
      headers: { authorization: `Bearer ${superadminToken}` },
    });
    assert.equal(invVerify.statusCode, 404);

    // Non-existent restore returns 404
    const invRestore = await app.inject({
      method: "POST",
      url: "/api/v1/admin/backups/non-existent-id/restore",
      headers: { authorization: `Bearer ${superadminToken}` },
    });
    assert.equal(invRestore.statusCode, 404);

    // Non-existent delete returns 404
    const invDel = await app.inject({
      method: "DELETE",
      url: "/api/v1/admin/backups/non-existent-id",
      headers: { authorization: `Bearer ${superadminToken}` },
    });
    assert.equal(invDel.statusCode, 404);
  });

  after(async () => {
    if (app) await app.close();
    if (redis) await redis.quit();
    if (rawClient && typeof rawClient.close === "function") {
      await rawClient.close();
    }
  });
});
