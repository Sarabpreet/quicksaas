import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/index.js";

export interface AuditEventParams {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId || null,
      userId: params.userId || null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress || null,
    });
  } catch (err: any) {
    console.error("[AuditLog] Failed to record audit log:", err.message);
  }
}
