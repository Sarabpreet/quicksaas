import { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { jobRecords } from "../../db/schema/index.js";
import { redis, isRedisReady } from "../../redis/client.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

export async function jobRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.addHook("preHandler", requireRole(["owner", "admin"]));

  // List recent jobs
  server.get("/api/v1/jobs", {
    schema: {
      tags: ["Jobs & Queues"],
      summary: "List background jobs and statuses",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          status: { type: "string" },
          limit: { type: "integer", default: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const { status, limit = 20 } = request.query as any;

    const query = db.query.jobRecords.findMany({
      where: status ? eq(jobRecords.status, status) : undefined,
      orderBy: desc(jobRecords.createdAt),
      limit: Number(limit),
    });

    const jobs = await query;
    return reply.send(jobs);
  });

  // Enqueue a new background job
  server.post("/api/v1/jobs/enqueue", {
    schema: {
      tags: ["Jobs & Queues"],
      summary: "Enqueue a job to the background queue",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name", "payload"],
        properties: {
          name: { type: "string" },
          queueName: { type: "string", default: "default" },
          payload: { type: "object" },
        },
      },
    },
  }, async (request, reply) => {
    const { name, queueName = "default", payload = {} } = request.body as any;

    // Record job in database
    const [job] = await db
      .insert(jobRecords)
      .values({
        name,
        queueName,
        payload,
        status: "pending",
      })
      .returning();

    // Push to Redis queue if Redis is connected
    if (isRedisReady()) {
      try {
        await redis.lpush(`queue:${queueName}`, JSON.stringify({ jobId: job.id, name, payload }));
      } catch (err: any) {
        console.warn("[Jobs] Failed to push to Redis queue:", err.message);
      }
    }

    return reply.status(201).send(job);
  });

  // Process next job (worker interface)
  server.post("/api/v1/jobs/worker/process-next", {
    schema: {
      tags: ["Jobs & Queues"],
      summary: "Worker trigger to process next pending job",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply) => {
    const nextJob = await db.query.jobRecords.findFirst({
      where: eq(jobRecords.status, "pending"),
      orderBy: jobRecords.createdAt,
    });

    if (!nextJob) {
      return reply.send({ message: "No pending jobs in queue" });
    }

    // Mark processing then completed
    await db
      .update(jobRecords)
      .set({ status: "processing", attempts: nextJob.attempts + 1 })
      .where(eq(jobRecords.id, nextJob.id));

    // Simulate successful work
    const [completed] = await db
      .update(jobRecords)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(jobRecords.id, nextJob.id))
      .returning();

    return reply.send({
      message: `Processed job '${completed.name}' successfully`,
      job: completed,
    });
  });

  // Retry / Replay a failed job
  server.post("/api/v1/jobs/:id/retry", {
    schema: {
      tags: ["Jobs & Queues"],
      summary: "Retry/Replay a failed job",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;

    const [replayed] = await db
      .update(jobRecords)
      .set({
        status: "pending",
        lastError: null,
      })
      .where(eq(jobRecords.id, id))
      .returning();

    if (!replayed) return reply.status(404).send({ error: "Job record not found" });

    if (isRedisReady()) {
      try {
        await redis.lpush(`queue:${replayed.queueName}`, JSON.stringify({ jobId: replayed.id, name: replayed.name }));
      } catch {}
    }

    return reply.send({ message: "Job reset to pending for retry", job: replayed });
  });
}
