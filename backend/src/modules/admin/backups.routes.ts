import { FastifyInstance } from "fastify";
import { authenticate, requireSuperadmin } from "../../middleware/auth.js";
import {
  createBackup,
  listBackups,
  getBackup,
  verifyBackup,
  restoreBackup,
  deleteBackup,
} from "../../lib/backup.js";
import { logAuditEvent } from "../../lib/audit.js";

export async function backupRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.addHook("preHandler", requireSuperadmin);

  // List all available backups
  server.get("/api/v1/admin/backups", {
    schema: {
      tags: ["Superadmin Operations", "Disaster Recovery"],
      summary: "List all platform backups and disaster recovery snapshots",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply) => {
    const backups = await listBackups();
    return reply.send({ backups });
  });

  // Create an on-demand backup snapshot
  server.post("/api/v1/admin/backups", {
    schema: {
      tags: ["Superadmin Operations", "Disaster Recovery"],
      summary: "Trigger an on-demand platform snapshot (Database & Storage)",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          label: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { label } = (request.body as any) || {};

    const manifest = await createBackup({ label });

    await logAuditEvent({
      organizationId: request.organizationId || null,
      userId: request.user?.userId || null,
      action: "backup.created",
      resourceType: "backup",
      resourceId: manifest.id,
      metadata: {
        filename: manifest.filename,
        tablesSummary: manifest.tablesSummary,
        archiveSizeBytes: manifest.archiveSizeBytes,
        sha256: manifest.sha256,
        actorEmail: request.user?.email,
      },
    });

    return reply.status(201).send({
      message: "Backup created successfully",
      backup: manifest,
    });
  });

  // Get specific backup details
  server.get("/api/v1/admin/backups/:id", {
    schema: {
      tags: ["Superadmin Operations", "Disaster Recovery"],
      summary: "Get backup details and manifest",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const backup = await getBackup(id);

    if (!backup) {
      return reply.status(404).send({ error: "Backup not found" });
    }

    return reply.send(backup);
  });

  // Verify backup checksum and archive integrity
  server.post("/api/v1/admin/backups/:id/verify", {
    schema: {
      tags: ["Superadmin Operations", "Disaster Recovery"],
      summary: "Verify backup archive checksum and integrity without restoring",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const verification = await verifyBackup(id);
      return reply.send(verification);
    } catch (err: any) {
      const statusCode = err.message.includes("not found") ? 404 : 400;
      return reply.status(statusCode).send({ error: err.message });
    }
  });

  // Restore platform state from a backup snapshot
  server.post("/api/v1/admin/backups/:id/restore", {
    schema: {
      tags: ["Superadmin Operations", "Disaster Recovery"],
      summary: "Restore platform database and tenant storage from backup archive",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const result = await restoreBackup(id);

      await logAuditEvent({
        organizationId: request.organizationId || null,
        userId: request.user?.userId || null,
        action: "backup.restored",
        resourceType: "backup",
        resourceId: id,
        metadata: {
          restoredAt: result.restoredAt,
          tablesRestored: result.verification.restoredTables,
          actorEmail: request.user?.email,
        },
      });

      return reply.send({
        message: "Platform restored successfully",
        result,
      });
    } catch (err: any) {
      const statusCode = err.message.includes("not found") ? 404 : 400;
      return reply.status(statusCode).send({
        error: "Failed to restore backup: " + err.message,
      });
    }
  });

  // Delete a backup snapshot
  server.delete("/api/v1/admin/backups/:id", {
    schema: {
      tags: ["Superadmin Operations", "Disaster Recovery"],
      summary: "Delete backup archive from disk",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const success = await deleteBackup(id);

    if (!success) {
      return reply.status(404).send({ error: "Backup not found" });
    }

    await logAuditEvent({
      organizationId: request.organizationId || null,
      userId: request.user?.userId || null,
      action: "backup.deleted",
      resourceType: "backup",
      resourceId: id,
      metadata: {
        actorEmail: request.user?.email,
      },
    });

    return reply.send({ message: "Backup deleted successfully" });
  });
}
