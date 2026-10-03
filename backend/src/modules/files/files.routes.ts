import { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs";
import { db } from "../../db/client.js";
import { files } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { requirePlanEntitlement } from "../../middleware/entitlements.js";
import { logAuditEvent } from "../../lib/audit.js";

const storageBaseDir = process.env.STORAGE_LOCAL_DIR
  ? path.resolve(process.env.STORAGE_LOCAL_DIR)
  : path.resolve(process.cwd(), ".data", "storage");

export async function fileRoutes(server: FastifyInstance) {
  // Ensure storage root directory exists
  if (!fs.existsSync(storageBaseDir)) {
    fs.mkdirSync(storageBaseDir, { recursive: true });
  }

  // Download raw file content (can be accessed by authenticated users, or public files)
  server.get("/api/v1/files/:id/download", async (request, reply) => {
    const { id } = request.params as any;

    const file = await db.query.files.findFirst({
      where: eq(files.id, id),
    });

    if (!file) return reply.status(404).send({ error: "File not found" });

    // If file is not public, require authentication
    if (!file.isPublic) {
      await authenticate(request, reply);
      if (reply.sent) return;

      if (file.organizationId !== request.organizationId && !request.user?.isSuperadmin) {
        return reply.status(403).send({ error: "Access denied to this file" });
      }
    }

    if (!fs.existsSync(file.storedPath)) {
      return reply.status(404).send({ error: "File content missing from storage" });
    }

    const buffer = fs.readFileSync(file.storedPath);
    reply.header("Content-Type", file.mimeType);
    reply.header("Content-Disposition", `inline; filename="${file.filename}"`);
    return reply.send(buffer);
  });

  // Protected routes below
  server.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", authenticate);

    // List files
    protectedRoutes.get("/api/v1/files", {
      schema: {
        tags: ["Files"],
        summary: "List files for organization",
        security: [{ bearerAuth: [] }],
      },
    }, async (request, reply) => {
      const orgId = request.organizationId;
      if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

      const fileList = await db.query.files.findMany({
        where: eq(files.organizationId, orgId),
        orderBy: desc(files.createdAt),
      });

      return reply.send(
        fileList.map((f: any) => ({
          id: f.id,
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          isPublic: f.isPublic,
          downloadUrl: `/api/v1/files/${f.id}/download`,
          createdAt: f.createdAt,
        }))
      );
    });

    // Upload file (base64)
    protectedRoutes.post("/api/v1/files", {
      preHandler: [
        requireRole(["owner", "admin", "member"]),
        requirePlanEntitlement("storage", (req) => {
          const b64 = (req.body as any)?.contentBase64 || "";
          return Math.ceil(b64.length * 0.75);
        }),
      ],
      schema: {
        tags: ["Files"],
        summary: "Upload a file (Base64)",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["filename", "contentBase64"],
          properties: {
            filename: { type: "string" },
            mimeType: { type: "string" },
            contentBase64: { type: "string" },
            isPublic: { type: "boolean", default: false },
          },
        },
      },
    }, async (request, reply) => {
      const orgId = request.organizationId;
      if (!orgId) return reply.status(400).send({ error: "Missing active organization" });

      const { filename, contentBase64, mimeType = "application/octet-stream", isPublic = false } = request.body as any;

      const orgDir = path.join(storageBaseDir, orgId);
      if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
      }

      const fileBuffer = Buffer.from(contentBase64, "base64");
      const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(orgDir, safeFilename);

      fs.writeFileSync(filePath, fileBuffer);

      const [newFile] = await db
        .insert(files)
        .values({
          organizationId: orgId,
          uploadedByUserId: request.user?.userId || null,
          filename,
          storedPath: filePath,
          mimeType,
          sizeBytes: fileBuffer.length,
          isPublic,
        })
        .returning();

      await logAuditEvent({
        organizationId: orgId,
        userId: request.user?.userId,
        action: "file.uploaded",
        resourceType: "file",
        resourceId: newFile.id,
        metadata: { filename, sizeBytes: fileBuffer.length },
        ipAddress: request.ip,
      });

      return reply.status(201).send({
        id: newFile.id,
        filename: newFile.filename,
        mimeType: newFile.mimeType,
        sizeBytes: newFile.sizeBytes,
        isPublic: newFile.isPublic,
        downloadUrl: `/api/v1/files/${newFile.id}/download`,
        createdAt: newFile.createdAt,
      });
    });

    // Delete file
    protectedRoutes.delete("/api/v1/files/:id", {
      preHandler: [requireRole(["owner", "admin"])],
      schema: {
        tags: ["Files"],
        summary: "Delete a file",
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

      const file = await db.query.files.findFirst({
        where: and(eq(files.id, id), eq(files.organizationId, orgId!)),
      });

      if (!file) return reply.status(404).send({ error: "File not found" });

      if (fs.existsSync(file.storedPath)) {
        try {
          fs.unlinkSync(file.storedPath);
        } catch {}
      }

      await db.delete(files).where(eq(files.id, id));

      await logAuditEvent({
        organizationId: orgId,
        userId: request.user?.userId,
        action: "file.deleted",
        resourceType: "file",
        resourceId: id,
        ipAddress: request.ip,
      });

      return reply.send({ message: "File deleted successfully" });
    });
  });
}
