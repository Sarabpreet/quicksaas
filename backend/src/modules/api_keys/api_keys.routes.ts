import { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db/client.js";
import { apiKeys } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { requirePlanEntitlement } from "../../middleware/entitlements.js";
import { logAuditEvent } from "../../lib/audit.js";

export async function apiKeyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // List API Keys
  server.get("/api/v1/api-keys", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["API Keys"],
      summary: "List organization API keys",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.organizationId, orgId),
      orderBy: desc(apiKeys.createdAt),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        revokedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return reply.send(keys);
  });

  // Create API Key
  server.post("/api/v1/api-keys", {
    preHandler: [requireRole(["owner", "admin"]), requirePlanEntitlement("api_keys")],
    schema: {
      tags: ["API Keys"],
      summary: "Create a new API key",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          expiresInDays: { type: "integer", minimum: 1, maximum: 365 },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { name, expiresInDays } = request.body as any;

    const prefix = `qs_live_${crypto.randomBytes(4).toString("hex")}`;
    const secretPart = crypto.randomBytes(24).toString("hex");
    const rawApiKey = `${prefix}_${secretPart}`;
    const keyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [key] = await db
      .insert(apiKeys)
      .values({
        organizationId: orgId,
        name,
        keyPrefix: prefix,
        keyHash,
        expiresAt,
      })
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: key.id,
      metadata: { name: key.name, keyPrefix: prefix },
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      message: "API key created successfully. Store this key securely; it will not be shown again.",
      apiKey: rawApiKey,
      id: key.id,
      name: key.name,
      keyPrefix: prefix,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    });
  });

  // Revoke API Key
  server.delete("/api/v1/api-keys/:id", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["API Keys"],
      summary: "Revoke an API key",
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

    const [revoked] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, orgId!)))
      .returning();

    if (!revoked) {
      return reply.status(404).send({ error: "API key not found" });
    }

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: id,
      ipAddress: request.ip,
    });

    return reply.send({ message: "API key revoked successfully", id: revoked.id });
  });
}
