import { FastifyRequest, FastifyReply } from "fastify";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import crypto from "node:crypto";
import { verifyToken, TokenPayload } from "../lib/jwt.js";
import { db } from "../db/client.js";
import { apiKeys, memberships, ApiKey } from "../db/schema/index.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload;
    apiKey?: ApiKey;
    organizationId?: string;
    userRole?: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const apiKeyHeader = request.headers["x-api-key"] as string | undefined;
  const authHeader = request.headers.authorization;

  // 1. Authenticate via API Key if provided
  if (apiKeyHeader) {
    const keyHash = crypto.createHash("sha256").update(apiKeyHeader.trim()).digest("hex");
    const now = new Date();

    const key = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now))
      ),
    });

    if (!key) {
      return reply.status(401).send({ error: "Invalid, expired, or revoked API Key" });
    }

    request.apiKey = key;
    request.organizationId = key.organizationId;
    request.userRole = "admin"; // Programmatic API keys operate with admin privileges in the organization
    return;
  }

  // 2. Authenticate via Bearer JWT
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid authorization header (Bearer token or X-API-Key required)" });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }

  request.user = payload;
  const orgHeader = request.headers["x-organization-id"] as string | undefined;
  request.organizationId = orgHeader || payload.organizationId;

  // If organization is not explicitly set, resolve from user's memberships or fallback for superadmin
  if (!request.organizationId && request.user) {
    const defaultMembership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, request.user.userId),
    });
    if (defaultMembership) {
      request.organizationId = defaultMembership.organizationId;
    } else if (request.user.isSuperadmin) {
      const firstOrg = await db.query.organizations.findFirst();
      if (firstOrg) {
        request.organizationId = firstOrg.id;
      }
    }
  }

  // If organization is resolved and user is authenticated, load user role for that org
  if (request.organizationId && request.user) {
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.organizationId, request.organizationId),
        eq(memberships.userId, request.user.userId)
      ),
    });

    if (membership) {
      request.userRole = membership.role;
    } else if (request.user.isSuperadmin) {
      request.userRole = "owner";
    }
  }
}

// Role-Based Access Control (RBAC) middleware factory
export function requireRole(allowedRoles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    // Superadmin bypasses RBAC
    if (request.user?.isSuperadmin) {
      return;
    }

    if (!request.userRole || !allowedRoles.includes(request.userRole)) {
      return reply.status(403).send({
        error: "Forbidden: insufficient permissions",
        requiredRoles: allowedRoles,
        currentRole: request.userRole || "none",
      });
    }
  };
}

// Superadmin only middleware
export async function requireSuperadmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user?.isSuperadmin) {
    return reply.status(403).send({ error: "Forbidden: Superadmin access required" });
  }
}
