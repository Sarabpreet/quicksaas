import { FastifyInstance } from "fastify";
import { eq, and, or, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { settings } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

export async function settingsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // List all settings
  server.get("/api/v1/settings", {
    schema: {
      tags: ["Settings"],
      summary: "List settings for organization",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;

    const allSettings = await db.query.settings.findMany({
      where: or(isNull(settings.organizationId), eq(settings.organizationId, orgId!)),
    });

    const settingsMap: Record<string, any> = {};
    for (const s of allSettings) {
      if (settingsMap[s.key] === undefined || s.organizationId === orgId) {
        settingsMap[s.key] = s.value;
      }
    }

    return reply.send({ settings: settingsMap });
  });

  // Get single setting
  server.get("/api/v1/settings/:key", {
    schema: {
      tags: ["Settings"],
      summary: "Get specific setting by key",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["key"],
        properties: { key: { type: "string" } },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { key } = request.params as any;

    const setting = (await db.query.settings.findFirst({
      where: and(eq(settings.key, key), eq(settings.organizationId, orgId!)),
    })) || (await db.query.settings.findFirst({
      where: and(eq(settings.key, key), isNull(settings.organizationId)),
    }));

    if (!setting) return reply.status(404).send({ error: `Setting '${key}' not found` });

    return reply.send({ key: setting.key, value: setting.value });
  });

  // Update or set setting (Owner/Admin only)
  server.put("/api/v1/settings/:key", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Settings"],
      summary: "Set or update setting",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["key"],
        properties: { key: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["value"],
        properties: { value: {} },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { key } = request.params as any;
    const { value } = request.body as any;

    const existing = await db.query.settings.findFirst({
      where: and(eq(settings.key, key), eq(settings.organizationId, orgId!)),
    });

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return reply.send(updated);
    } else {
      const [created] = await db
        .insert(settings)
        .values({
          organizationId: orgId,
          key,
          value,
        })
        .returning();
      return reply.status(201).send(created);
    }
  });
}
