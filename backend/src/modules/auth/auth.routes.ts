import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, organizations, memberships } from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../lib/crypto.js";
import { signToken } from "../../lib/jwt.js";
import { authenticate } from "../../middleware/auth.js";
import { logAuditEvent } from "../../lib/audit.js";

export async function authRoutes(server: FastifyInstance) {
  // Register
  server.post("/api/v1/auth/register", {
    schema: {
      tags: ["Auth"],
      summary: "Register a new user",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          name: { type: "string" },
          organizationName: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, name, organizationName } = request.body as any;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      return reply.status(409).send({ error: "User with this email already exists" });
    }

    const passwordHash = hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name: name || null,
        emailVerifiedAt: new Date(),
      })
      .returning();

    // Create initial Organization
    const orgName = organizationName || (name ? `${name}'s Org` : "Default Organization");
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug,
      })
      .returning();

    // Assign as owner
    await db.insert(memberships).values({
      organizationId: newOrg.id,
      userId: newUser.id,
      role: "owner",
    });

    // Audit log
    await logAuditEvent({
      organizationId: newOrg.id,
      userId: newUser.id,
      action: "user.registered",
      resourceType: "user",
      resourceId: newUser.id,
      ipAddress: request.ip,
    });

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      organizationId: newOrg.id,
      isSuperadmin: newUser.isSuperadmin,
    });

    return reply.status(201).send({
      message: "Registration successful",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      organization: newOrg,
    });
  });

  // Login
  server.post("/api/v1/auth/login", {
    schema: {
      tags: ["Auth"],
      summary: "Login with email & password",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as any;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    // Find default organization membership
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, user.id),
    });

    await logAuditEvent({
      organizationId: membership?.organizationId,
      userId: user.id,
      action: "user.logged_in",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: request.ip,
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: membership?.organizationId,
      isSuperadmin: user.isSuperadmin,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperadmin: user.isSuperadmin,
      },
      activeOrganizationId: membership?.organizationId,
    });
  });

  // Current User Profile
  server.get("/api/v1/auth/me", {
    preHandler: [authenticate],
    schema: {
      tags: ["Auth"],
      summary: "Get current user profile & memberships",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user!.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        isSuperadmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const userMemberships = await db
      .select({
        role: memberships.role,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(eq(memberships.userId, userId));

    return reply.send({
      user,
      organizations: userMemberships,
    });
  });

  // Update Profile
  server.patch("/api/v1/auth/profile", {
    preHandler: [authenticate],
    schema: {
      tags: ["Auth"],
      summary: "Update profile name",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { name } = request.body as any;

    const [updated] = await db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, email: users.email });

    return reply.send(updated);
  });

  // Change Password
  server.post("/api/v1/auth/change-password", {
    preHandler: [authenticate],
    schema: {
      tags: ["Auth"],
      summary: "Change account password",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string" },
          newPassword: { type: "string", minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { currentPassword, newPassword } = request.body as any;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      return reply.status(400).send({ error: "Current password does not match" });
    }

    const newHash = hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await logAuditEvent({
      userId,
      action: "user.password_changed",
      resourceType: "user",
      resourceId: userId,
      ipAddress: request.ip,
    });

    return reply.send({ message: "Password updated successfully" });
  });
}
