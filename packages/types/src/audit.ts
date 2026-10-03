export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "promote"
  | "restore"
  | "revoke"
  | "export";

export interface AuditLogEntry {
  id: string;
  organizationId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string | Date;
}
