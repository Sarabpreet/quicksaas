import { FastifyInstance } from "fastify";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  resourceDefinitions,
  dynamicEntities,
  FieldDefinition,
} from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { requirePlanEntitlement } from "../../middleware/entitlements.js";
import { logAuditEvent } from "../../lib/audit.js";

// Helper to validate incoming payload against defined fields
function validateEntityPayload(fields: FieldDefinition[], payload: Record<string, any>) {
  const errors: string[] = [];
  const cleaned: Record<string, any> = {};

  for (const field of fields) {
    const val = payload[field.name];

    if (field.required && (val === undefined || val === null || val === "")) {
      errors.push(`Field '${field.name}' is required`);
      continue;
    }

    if (val !== undefined && val !== null) {
      switch (field.type) {
        case "number":
          if (typeof val !== "number" && isNaN(Number(val))) {
            errors.push(`Field '${field.name}' must be a number`);
          } else {
            cleaned[field.name] = Number(val);
          }
          break;
        case "boolean":
          cleaned[field.name] = Boolean(val);
          break;
        case "date":
          const d = new Date(val);
          if (isNaN(d.getTime())) {
            errors.push(`Field '${field.name}' must be a valid date`);
          } else {
            cleaned[field.name] = d.toISOString();
          }
          break;
        case "json":
          cleaned[field.name] = typeof val === "object" ? val : JSON.parse(val);
          break;
        default: // text
          cleaned[field.name] = String(val);
      }
    } else if (field.defaultValue !== undefined) {
      cleaned[field.name] = field.defaultValue;
    }
  }

  return { errors, cleaned };
}

export async function resourceRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // ==========================================
  // 1. API Studio - Resource Definition Management
  // ==========================================

  // List resource definitions
  server.get("/api/v1/resources", {
    schema: {
      tags: ["API Studio"],
      summary: "List defined resources in organization",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const definitions = await db.query.resourceDefinitions.findMany({
      where: eq(resourceDefinitions.organizationId, orgId),
      orderBy: desc(resourceDefinitions.createdAt),
    });

    return reply.send(definitions);
  });

  // Create new resource definition (Owner/Admin only)
  server.post("/api/v1/resources", {
    preHandler: [requireRole(["owner", "admin"]), requirePlanEntitlement("resources")],
    schema: {
      tags: ["API Studio"],
      summary: "Define a new dynamic resource (Owner/Admin only)",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "type"],
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["text", "number", "boolean", "date", "json"] },
                required: { type: "boolean" },
                unique: { type: "boolean" },
                defaultValue: {},
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { name, slug, description, fields = [] } = request.body as any;

    const existing = await db.query.resourceDefinitions.findFirst({
      where: and(
        eq(resourceDefinitions.organizationId, orgId),
        eq(resourceDefinitions.slug, slug.toLowerCase())
      ),
    });

    if (existing) {
      return reply.status(409).send({ error: `Resource with slug '${slug}' already exists` });
    }

    const [def] = await db
      .insert(resourceDefinitions)
      .values({
        organizationId: orgId,
        name,
        slug: slug.toLowerCase(),
        description: description || null,
        fields,
        isPublished: true,
      })
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: "resource_definition.created",
      resourceType: "resource_definition",
      resourceId: def.id,
      metadata: { name: def.name, slug: def.slug },
      ipAddress: request.ip,
    });

    return reply.status(201).send(def);
  });

  // Promote resource to code (Owner/Admin only)
  server.post("/api/v1/resources/:id/promote", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["API Studio"],
      summary: "Promote dynamic resource to static TypeScript code scaffold",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { id } = request.params as any;

    const conditions = [eq(resourceDefinitions.id, id)];
    if (!request.user?.isSuperadmin) {
      if (!orgId) return reply.status(400).send({ error: "Missing active organization" });
      conditions.push(eq(resourceDefinitions.organizationId, orgId));
    }

    const def = await db.query.resourceDefinitions.findFirst({
      where: and(...conditions),
    });

    if (!def) return reply.status(404).send({ error: "Resource definition not found" });

    const generatedSchemaCode = `import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const ${def.slug} = pgTable("${def.slug}", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  ${def.fields
    .map((f: FieldDefinition) => {
      let typeFn = "text";
      if (f.type === "number") typeFn = "integer";
      if (f.type === "boolean") typeFn = "boolean";
      if (f.type === "json") typeFn = "jsonb";
      if (f.type === "date") typeFn = "timestamp";
      return `${f.name}: ${typeFn}("${f.name}")${f.required ? ".notNull()" : ""},`;
    })
    .join("\n  ")}
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
`;

    await logAuditEvent({
      organizationId: def.organizationId,
      userId: request.user?.userId,
      action: "resource_definition.promoted",
      resourceType: "resource_definition",
      resourceId: def.id,
      metadata: { name: def.name, slug: def.slug },
      ipAddress: request.ip,
    });

    return reply.send({
      message: `Resource '${def.name}' code blueprint generated`,
      resource: def.name,
      slug: def.slug,
      generatedSchema: generatedSchemaCode,
      destinationHint: `src/modules/${def.slug}/${def.slug}.schema.ts`,
    });
  });

  // ==========================================
  // 2. Dynamic Resource Engine Runtime (/api/v1/data/{resource})
  // ==========================================

  // List dynamic records (Any org member can read)
  server.get("/api/v1/data/:resource", {
    schema: {
      tags: ["Dynamic Data"],
      summary: "List records for a dynamic resource with search & pagination",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["resource"],
        properties: { resource: { type: "string" } },
      },
      querystring: {
        type: "object",
        properties: {
          search: { type: "string" },
          limit: { type: "integer", default: 50 },
          offset: { type: "integer", default: 0 },
          sort: { type: "string", enum: ["asc", "desc"], default: "desc" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { resource: resourceSlug } = request.params as any;
    const { search, limit = 50, offset = 0, sort = "desc" } = request.query as any;

    const def = await db.query.resourceDefinitions.findFirst({
      where: and(
        eq(resourceDefinitions.organizationId, orgId),
        eq(resourceDefinitions.slug, resourceSlug.toLowerCase())
      ),
    });

    if (!def) {
      return reply.status(404).send({ error: `Resource '${resourceSlug}' not found` });
    }

    const orderFn = sort === "asc" ? asc : desc;
    let records = await db.query.dynamicEntities.findMany({
      where: and(
        eq(dynamicEntities.organizationId, orgId),
        eq(dynamicEntities.resourceId, def.id)
      ),
      orderBy: orderFn(dynamicEntities.createdAt),
      limit: Number(limit),
      offset: Number(offset),
    });

    // In-memory text search filtering if search term provided
    if (search) {
      const q = search.toLowerCase();
      records = records.filter((r: any) =>
        JSON.stringify(r.data).toLowerCase().includes(q)
      );
    }

    return reply.send({
      resource: def.name,
      slug: def.slug,
      total: records.length,
      limit: Number(limit),
      offset: Number(offset),
      data: records.map((r: any) => ({
        id: r.id,
        ...r.data,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  });

  // Create dynamic record (Owner, Admin, Member - Viewers blocked)
  server.post("/api/v1/data/:resource", {
    preHandler: [requireRole(["owner", "admin", "member"])],
    schema: {
      tags: ["Dynamic Data"],
      summary: "Create a record for a dynamic resource",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["resource"],
        properties: { resource: { type: "string" } },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { resource: resourceSlug } = request.params as any;

    const def = await db.query.resourceDefinitions.findFirst({
      where: and(
        eq(resourceDefinitions.organizationId, orgId),
        eq(resourceDefinitions.slug, resourceSlug.toLowerCase())
      ),
    });

    if (!def) {
      return reply.status(404).send({ error: `Resource '${resourceSlug}' not found` });
    }

    const payload = (request.body as Record<string, any>) || {};
    const { errors, cleaned } = validateEntityPayload(def.fields, payload);

    if (errors.length > 0) {
      return reply.status(422).send({ error: "Validation failed", details: errors });
    }

    const [entity] = await db
      .insert(dynamicEntities)
      .values({
        organizationId: orgId,
        resourceId: def.id,
        data: cleaned,
      })
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: `${def.slug}.created`,
      resourceType: def.slug,
      resourceId: entity.id,
      metadata: cleaned,
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      id: entity.id,
      ...entity.data,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  });

  // Get dynamic record by id
  server.get("/api/v1/data/:resource/:id", {
    schema: {
      tags: ["Dynamic Data"],
      summary: "Get a single record by ID",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["resource", "id"],
        properties: {
          resource: { type: "string" },
          id: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { resource: resourceSlug, id } = request.params as any;

    const def = await db.query.resourceDefinitions.findFirst({
      where: and(
        eq(resourceDefinitions.organizationId, orgId),
        eq(resourceDefinitions.slug, resourceSlug.toLowerCase())
      ),
    });

    if (!def) {
      return reply.status(404).send({ error: `Resource '${resourceSlug}' not found` });
    }

    const record = await db.query.dynamicEntities.findFirst({
      where: and(
        eq(dynamicEntities.id, id),
        eq(dynamicEntities.organizationId, orgId),
        eq(dynamicEntities.resourceId, def.id)
      ),
    });

    if (!record) {
      return reply.status(404).send({ error: "Record not found" });
    }

    return reply.send({
      id: record.id,
      ...record.data,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  });

  // Update dynamic record (Owner, Admin, Member)
  server.patch("/api/v1/data/:resource/:id", {
    preHandler: [requireRole(["owner", "admin", "member"])],
    schema: {
      tags: ["Dynamic Data"],
      summary: "Update a dynamic record",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["resource", "id"],
        properties: {
          resource: { type: "string" },
          id: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { resource: resourceSlug, id } = request.params as any;

    const def = await db.query.resourceDefinitions.findFirst({
      where: and(
        eq(resourceDefinitions.organizationId, orgId),
        eq(resourceDefinitions.slug, resourceSlug.toLowerCase())
      ),
    });

    if (!def) return reply.status(404).send({ error: `Resource '${resourceSlug}' not found` });

    const existing = await db.query.dynamicEntities.findFirst({
      where: and(
        eq(dynamicEntities.id, id),
        eq(dynamicEntities.organizationId, orgId),
        eq(dynamicEntities.resourceId, def.id)
      ),
    });

    if (!existing) return reply.status(404).send({ error: "Record not found" });

    const payload = (request.body as Record<string, any>) || {};
    const merged = { ...existing.data, ...payload };
    const { errors, cleaned } = validateEntityPayload(def.fields, merged);

    if (errors.length > 0) {
      return reply.status(422).send({ error: "Validation failed", details: errors });
    }

    const [updated] = await db
      .update(dynamicEntities)
      .set({
        data: cleaned,
        updatedAt: new Date(),
      })
      .where(eq(dynamicEntities.id, id))
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: `${def.slug}.updated`,
      resourceType: def.slug,
      resourceId: updated.id,
      metadata: cleaned,
      ipAddress: request.ip,
    });

    return reply.send({
      id: updated.id,
      ...updated.data,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });

  // Delete dynamic record (Owner, Admin, Member)
  server.delete("/api/v1/data/:resource/:id", {
    preHandler: [requireRole(["owner", "admin", "member"])],
    schema: {
      tags: ["Dynamic Data"],
      summary: "Delete a dynamic record",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["resource", "id"],
        properties: {
          resource: { type: "string" },
          id: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

    const { resource: resourceSlug, id } = request.params as any;

    const def = await db.query.resourceDefinitions.findFirst({
      where: and(
        eq(resourceDefinitions.organizationId, orgId),
        eq(resourceDefinitions.slug, resourceSlug.toLowerCase())
      ),
    });

    if (!def) return reply.status(404).send({ error: `Resource '${resourceSlug}' not found` });

    const [deleted] = await db
      .delete(dynamicEntities)
      .where(
        and(
          eq(dynamicEntities.id, id),
          eq(dynamicEntities.organizationId, orgId),
          eq(dynamicEntities.resourceId, def.id)
        )
      )
      .returning();

    if (!deleted) return reply.status(404).send({ error: "Record not found" });

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: `${def.slug}.deleted`,
      resourceType: def.slug,
      resourceId: deleted.id,
      ipAddress: request.ip,
    });

    return reply.send({ message: "Record deleted successfully", id: deleted.id });
  });
}
