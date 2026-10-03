import { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { auditLogs, users } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

export async function auditRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  server.get("/api/v1/audit-logs", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Audit Logs"],
      summary: "List audit logs for organization",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          action: { type: "string" },
          resourceType: { type: "string" },
          limit: { type: "integer", default: 50, maximum: 100 },
          offset: { type: "integer", default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId && !request.user?.isSuperadmin) {
      return reply.status(400).send({ error: "Missing active organization" });
    }

    const { action, resourceType, limit = 50, offset = 0 } = request.query as any;

    const conditions = [];
    if (orgId) conditions.push(eq(auditLogs.organizationId, orgId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));

    let query = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        actor: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    const logs = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return reply.send({
      total: logs.length,
      limit: Number(limit),
      offset: Number(offset),
      logs,
    });
  });
}
