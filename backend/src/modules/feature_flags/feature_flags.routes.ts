import { FastifyInstance } from "fastify";
import { eq, or, isNull, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { featureFlags } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

export async function featureFlagRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // Evaluate flags for current client
  server.get("/api/v1/feature-flags/evaluate", {
    schema: {
      tags: ["Feature Flags"],
      summary: "Evaluate all feature flags for current organization",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;

    const allFlags = await db.query.featureFlags.findMany({
      where: or(isNull(featureFlags.organizationId), eq(featureFlags.organizationId, orgId!)),
      orderBy: desc(featureFlags.createdAt),
    });

    const evaluated: Record<string, boolean> = {};
    for (const flag of allFlags) {
      if (evaluated[flag.key] === undefined || flag.organizationId === orgId) {
        evaluated[flag.key] = flag.isEnabled;
      }
    }

    return reply.send({ flags: evaluated });
  });

  // List all flag definitions (Owner/Admin)
  server.get("/api/v1/feature-flags", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Feature Flags"],
      summary: "List feature flag definitions",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;

    const flags = await db.query.featureFlags.findMany({
      where: or(isNull(featureFlags.organizationId), eq(featureFlags.organizationId, orgId!)),
    });

    return reply.send(flags);
  });

  // Create or override feature flag (Owner/Admin)
  server.post("/api/v1/feature-flags", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Feature Flags"],
      summary: "Create or override a feature flag",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["key", "name", "isEnabled"],
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          isEnabled: { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { key, name, description, isEnabled } = request.body as any;

    const [flag] = await db
      .insert(featureFlags)
      .values({
        organizationId: orgId,
        key,
        name,
        description: description || null,
        isEnabled,
      })
      .returning();

    return reply.status(201).send(flag);
  });

  // Toggle feature flag
  server.patch("/api/v1/feature-flags/:id", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Feature Flags"],
      summary: "Toggle feature flag status",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
      body: {
        type: "object",
        required: ["isEnabled"],
        properties: { isEnabled: { type: "boolean" } },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const { isEnabled } = request.body as any;

    const [updated] = await db
      .update(featureFlags)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(featureFlags.id, id))
      .returning();

    if (!updated) return reply.status(404).send({ error: "Feature flag not found" });

    return reply.send(updated);
  });
}
