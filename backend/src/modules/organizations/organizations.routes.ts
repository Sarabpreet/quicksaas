import { FastifyInstance } from "fastify";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db/client.js";
import { organizations, memberships, users, organizationInvites } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { requirePlanEntitlement } from "../../middleware/entitlements.js";
import { logAuditEvent } from "../../lib/audit.js";

export async function organizationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // List user's organizations
  server.get("/api/v1/organizations", {
    schema: {
      tags: ["Organizations"],
      summary: "List user organizations",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user!.userId;

    const list = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: memberships.role,
        createdAt: organizations.createdAt,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(eq(memberships.userId, userId));

    return reply.send(list);
  });

  // Create organization
  server.post("/api/v1/organizations", {
    schema: {
      tags: ["Organizations"],
      summary: "Create a new organization",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { name, slug: providedSlug } = request.body as any;

    const baseSlug = (providedSlug || name).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name,
        slug,
      })
      .returning();

    await db.insert(memberships).values({
      organizationId: newOrg.id,
      userId,
      role: "owner",
    });

    await logAuditEvent({
      organizationId: newOrg.id,
      userId,
      action: "organization.created",
      resourceType: "organization",
      resourceId: newOrg.id,
      ipAddress: request.ip,
    });

    return reply.status(201).send(newOrg);
  });

  // Get organization members
  server.get("/api/v1/organizations/:id/members", {
    schema: {
      tags: ["Organizations"],
      summary: "Get organization members",
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
    const userId = request.user!.userId;
    const { id: orgId } = request.params as any;

    const userRole = await db.query.memberships.findFirst({
      where: and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId)),
    });

    if (!userRole && !request.user?.isSuperadmin) {
      return reply.status(403).send({ error: "Access denied to this organization" });
    }

    const members = await db
      .select({
        id: memberships.id,
        role: memberships.role,
        createdAt: memberships.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.organizationId, orgId));

    return reply.send(members);
  });

  // Invite member to organization
  server.post("/api/v1/organizations/:id/invites", {
    preHandler: [requireRole(["owner", "admin"]), requirePlanEntitlement("members")],
    schema: {
      tags: ["Organizations"],
      summary: "Invite member to organization (Owner/Admin only)",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
      body: {
        type: "object",
        required: ["email", "role"],
        properties: {
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin", "member", "viewer"] },
        },
      },
    },
  }, async (request, reply) => {
    const { id: orgId } = request.params as any;
    const { email, role } = request.body as any;
    const userId = request.user?.userId;

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite] = await db
      .insert(organizationInvites)
      .values({
        organizationId: orgId,
        email: email.toLowerCase(),
        role,
        token,
        invitedByUserId: userId,
        expiresAt,
      })
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId,
      action: "organization.member_invited",
      resourceType: "invite",
      resourceId: invite.id,
      metadata: { invitedEmail: email, role },
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      message: "Invitation created successfully",
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
      },
    });
  });

  // Accept organization invitation
  server.post("/api/v1/organizations/invites/:token/accept", {
    schema: {
      tags: ["Organizations"],
      summary: "Accept organization invite using token",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["token"],
        properties: { token: { type: "string" } },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { token } = request.params as any;

    const invite = await db.query.organizationInvites.findFirst({
      where: and(
        eq(organizationInvites.token, token),
        isNull(organizationInvites.acceptedAt),
        gt(organizationInvites.expiresAt, new Date())
      ),
    });

    if (!invite) {
      return reply.status(404).send({ error: "Invalid, expired, or already accepted invitation" });
    }

    // Add to memberships
    await db
      .insert(memberships)
      .values({
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      })
      .onConflictDoNothing();

    // Mark accepted
    await db
      .update(organizationInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(organizationInvites.id, invite.id));

    return reply.send({ message: "Successfully joined organization", organizationId: invite.organizationId });
  });

  // Update member role (Owner only)
  server.patch("/api/v1/organizations/:id/members/:userId", {
    preHandler: [requireRole(["owner"])],
    schema: {
      tags: ["Organizations"],
      summary: "Update member role (Owner only)",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id", "userId"],
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
        },
      },
      body: {
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: ["admin", "member", "viewer"] },
        },
      },
    },
  }, async (request, reply) => {
    const { id: orgId, userId: targetUserId } = request.params as any;
    const { role } = request.body as any;

    const [updated] = await db
      .update(memberships)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, targetUserId)))
      .returning();

    if (!updated) return reply.status(404).send({ error: "Member not found" });

    return reply.send({ message: "Role updated", membership: updated });
  });

  // Remove member (Owner/Admin only)
  server.delete("/api/v1/organizations/:id/members/:userId", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Organizations"],
      summary: "Remove member from organization",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id", "userId"],
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request, reply) => {
    const { id: orgId, userId: targetUserId } = request.params as any;

    const [deleted] = await db
      .delete(memberships)
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, targetUserId)))
      .returning();

    if (!deleted) return reply.status(404).send({ error: "Member not found in organization" });

    return reply.send({ message: "Member removed from organization" });
  });
}
