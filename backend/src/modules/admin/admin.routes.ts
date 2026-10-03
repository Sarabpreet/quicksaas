import { FastifyInstance } from "fastify";
import { sql, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { organizations, users, dynamicEntities, jobRecords } from "../../db/schema/index.js";
import { authenticate, requireSuperadmin } from "../../middleware/auth.js";

export async function adminRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.addHook("preHandler", requireSuperadmin);

  // Global platform statistics
  server.get("/api/v1/admin/stats", {
    schema: {
      tags: ["Superadmin Operations"],
      summary: "Global platform statistics (Superadmin only)",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply) => {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
    const [entityCount] = await db.select({ count: sql<number>`count(*)` }).from(dynamicEntities);
    const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobRecords);

    return reply.send({
      totalUsers: Number(userCount?.count || 0),
      totalOrganizations: Number(orgCount?.count || 0),
      totalDynamicRecords: Number(entityCount?.count || 0),
      totalBackgroundJobs: Number(jobCount?.count || 0),
      platformVersion: "1.0.0",
      status: "operational",
    });
  });

  // List all organizations across platform
  server.get("/api/v1/admin/organizations", {
    schema: {
      tags: ["Superadmin Operations"],
      summary: "List all tenant organizations (Superadmin only)",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply) => {
    const orgs = await db.query.organizations.findMany({
      orderBy: desc(organizations.createdAt),
      limit: 100,
    });
    return reply.send(orgs);
  });

  // List all users across platform
  server.get("/api/v1/admin/users", {
    schema: {
      tags: ["Superadmin Operations"],
      summary: "List all registered users (Superadmin only)",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply) => {
    const userList = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      limit: 100,
      columns: {
        id: true,
        email: true,
        name: true,
        isSuperadmin: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
    return reply.send(userList);
  });

  // Tail system runtime and error logs from disk
  server.get("/api/v1/admin/system/logs", {
    schema: {
      tags: ["Superadmin Operations"],
      summary: "Tail system runtime and error logs from persistent disk files (Superadmin only)",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["app", "error"], default: "app" },
          lines: { type: "integer", default: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const { type = "app", lines = 100 } = request.query as { type?: "app" | "error"; lines?: number };
    const { logger, LOG_DIR } = await import("../../lib/logger.js");
    const logLines = await logger.getRecentLogs(type, Math.min(500, Math.max(1, lines)));

    return reply.send({
      type,
      logDir: LOG_DIR,
      totalLines: logLines.length,
      lines: logLines,
    });
  });
}
