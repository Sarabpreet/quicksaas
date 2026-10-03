import { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { redis, isRedisReady } from "../../redis/client.js";

export async function healthRoutes(server: FastifyInstance) {
  server.get("/health", {
    schema: {
      tags: ["System"],
      summary: "Health Check",
      description: "Returns the health and connection status of API, PostgreSQL and Redis",
    },
  }, async (_request, reply) => {
    let dbStatus = "healthy";
    try {
      await db.execute(sql`SELECT 1`);
    } catch (err: any) {
      dbStatus = `unhealthy: ${err.message}`;
    }

    let redisStatus = "disconnected";
    try {
      if (isRedisReady() || (await redis.ping()) === "PONG") {
        redisStatus = "healthy";
      }
    } catch {
      redisStatus = "unreachable";
    }

    const isHealthy = dbStatus === "healthy";
    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        engine: process.env.DATABASE_URL ? "postgresql-native" : "postgresql-pglite",
      },
      redis: {
        status: redisStatus,
      },
    });
  });
}
