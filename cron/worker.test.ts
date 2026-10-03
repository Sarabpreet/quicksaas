import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, rawClient } from "../backend/src/db/client.js";
import { redis } from "../backend/src/redis/client.js";
import { runMigrations } from "../backend/src/db/migrate.js";
import {
  organizations,
  jobRecords,
  emailTemplates,
  emailLogs,
  webhookEndpoints,
  webhookDeliveries,
  organizationInvites,
} from "../backend/src/db/schema/index.js";
import { executeJob, processNextJob, registerJobHandler } from "./worker.js";
import { runSchedulerTick, registeredTasks } from "./scheduler.js";

describe("QuickSaaS Cron & Background Worker Verification Suite", () => {
  let testOrgId: string;

  before(async () => {
    await runMigrations();

    // Ensure test organization exists
    let org = await db.query.organizations.findFirst();
    if (!org) {
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: "Cron Test Organization",
          slug: `cron-test-${Date.now()}`,
        })
        .returning();
      testOrgId = newOrg.id;
    } else {
      testOrgId = org.id;
    }
  });

  // 1. Transactional Email Dispatch Handler
  test("1. Worker processes 'email.send', renders templates, and logs delivery", async () => {
    const templateName = `welcome_cron_${Date.now()}`;
    await db.insert(emailTemplates).values({
      name: templateName,
      subject: "Welcome to {{company}}, {{name}}!",
      bodyHtml: "<p>Hello {{name}}, welcome to {{company}}.</p>",
      variables: ["name", "company"],
    });

    const [job] = await db
      .insert(jobRecords)
      .values({
        name: "email.send",
        queueName: "email",
        payload: {
          templateName,
          recipientEmail: "worker_test@quicksaas.dev",
          variables: {
            name: "Alex Developer",
            company: "QuickSaaS",
          },
          organizationId: testOrgId,
        },
        status: "pending",
      })
      .returning();

    const processed = await processNextJob("email");
    assert.ok(processed, "Job should have been processed");
    assert.equal(processed.id, job.id);
    assert.equal(processed.status, "completed");

    // Verify email_logs entry
    const log = await db.query.emailLogs.findFirst({
      where: eq(emailLogs.toAddress, "worker_test@quicksaas.dev"),
    });

    assert.ok(log, "Email log record should exist");
    assert.equal(log.subject, "Welcome to QuickSaaS, Alex Developer!");
    assert.equal(log.status, "sent");
  });

  // 2. Webhook Event Dispatch Handler
  test("2. Worker processes 'webhook.dispatch' and logs delivery with signature", async () => {
    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        organizationId: testOrgId,
        url: "mock://webhook.receiver/events",
        secret: "whsec_test_secret_12345",
        events: ["user.signup"],
        isActive: true,
      })
      .returning();

    const [job] = await db
      .insert(jobRecords)
      .values({
        name: "webhook.dispatch",
        queueName: "webhooks",
        payload: {
          endpointId: endpoint.id,
          event: "user.signup",
          data: { userId: "usr_999", email: "newuser@example.com" },
          organizationId: testOrgId,
        },
        status: "pending",
      })
      .returning();

    const processed = await processNextJob("webhooks");
    assert.ok(processed, "Webhook dispatch job should have been processed");
    assert.equal(processed.id, job.id);
    assert.equal(processed.status, "completed");

    // Verify webhook delivery record
    const delivery = await db.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.endpointId, endpoint.id),
    });

    assert.ok(delivery, "Webhook delivery record should be created");
    assert.equal(delivery.event, "user.signup");
    assert.equal(delivery.status, "success");
    assert.equal(delivery.responseStatus, 200);
  });

  // 3. Retry and Failure Exhaustion Mechanics
  test("3. Worker handles failing jobs: increments attempts, retains pending, then marks failed", async () => {
    let callCount = 0;
    registerJobHandler("test.faulty_task", async () => {
      callCount++;
      throw new Error(`Intentional simulation error #${callCount}`);
    });

    const [job] = await db
      .insert(jobRecords)
      .values({
        name: "test.faulty_task",
        queueName: "default",
        payload: { test: true },
        maxAttempts: 3,
        attempts: 0,
        status: "pending",
      })
      .returning();

    // First attempt -> should fail but remain pending for retry
    const res1 = await executeJob(job);
    assert.equal(res1.status, "pending");
    assert.equal(res1.attempts, 1);
    assert.match(res1.lastError || "", /simulation error #1/);

    // Second attempt -> should fail but remain pending
    const res2 = await executeJob(res1);
    assert.equal(res2.status, "pending");
    assert.equal(res2.attempts, 2);
    assert.match(res2.lastError || "", /simulation error #2/);

    // Third attempt (exhausted) -> status should transition to 'failed'
    const res3 = await executeJob(res2);
    assert.equal(res3.status, "failed");
    assert.equal(res3.attempts, 3);
    assert.match(res3.lastError || "", /simulation error #3/);
  });

  // 4. Stale Invitation Cleanup Task
  test("4. Worker executes 'cleanup.expired_invites' and purges expired records", async () => {
    const expiredToken = `exp_${Date.now()}`;
    const validToken = `val_${Date.now()}`;

    // Expired invite (in the past)
    await db.insert(organizationInvites).values({
      organizationId: testOrgId,
      email: "stale@quicksaas.dev",
      role: "member",
      token: expiredToken,
      expiresAt: new Date(Date.now() - 1000 * 3600), // 1 hour ago
    });

    // Valid invite (in the future)
    await db.insert(organizationInvites).values({
      organizationId: testOrgId,
      email: "valid@quicksaas.dev",
      role: "member",
      token: validToken,
      expiresAt: new Date(Date.now() + 1000 * 3600), // 1 hour from now
    });

    const [cleanupJob] = await db
      .insert(jobRecords)
      .values({
        name: "cleanup.expired_invites",
        queueName: "default",
        status: "pending",
      })
      .returning();

    const processed = await executeJob(cleanupJob);
    assert.equal(processed.status, "completed");

    // Assert expired invite deleted
    const staleInvite = await db.query.organizationInvites.findFirst({
      where: eq(organizationInvites.token, expiredToken),
    });
    assert.equal(staleInvite, undefined, "Expired invite should have been deleted");

    // Assert valid invite preserved
    const validInvite = await db.query.organizationInvites.findFirst({
      where: eq(organizationInvites.token, validToken),
    });
    assert.ok(validInvite, "Valid invite should be preserved");
  });

  // 5. Scheduler Tick and Recurring Tasks
  test("5. Scheduler tick evaluates scheduled tasks and enqueues due jobs", async () => {
    // Reset lastRunAt so tasks are evaluated as due
    for (const task of registeredTasks) {
      task.lastRunAt = undefined;
    }

    const tasksTriggered = await runSchedulerTick(new Date());
    assert.ok(tasksTriggered >= 2, `Expected at least 2 scheduled tasks triggered, got ${tasksTriggered}`);

    // Verify task jobs exist in jobRecords
    const backupJob = await db.query.jobRecords.findFirst({
      where: eq(jobRecords.name, "backup.create"),
    });
    assert.ok(backupJob, "backup.create job should be enqueued by scheduler");
    assert.equal(backupJob.status, "pending");

    // Running tick again immediately should trigger 0 tasks because they are not due yet
    const duplicateTicks = await runSchedulerTick(new Date());
    assert.equal(duplicateTicks, 0, "Duplicate immediate tick should trigger 0 tasks");
  });

  after(async () => {
    if (redis) await redis.quit();
    if (rawClient && typeof rawClient.close === "function") {
      await rawClient.close();
    }
  });
});
