export type UserRole = "owner" | "admin" | "member" | "viewer" | "superadmin";

export interface User {
  id: string;
  email: string;
  name: string;
  isSuperadmin: boolean;
  avatarUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  user?: User;
  organization?: Organization;
  createdAt: string | Date;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  token: string;
  invitedByUserId?: string | null;
  expiresAt: string | Date;
  acceptedAt?: string | Date | null;
  createdAt: string | Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  isSuperadmin: boolean;
  activeOrganizationId?: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt?: string | Date | null;
  lastUsedAt?: string | Date | null;
  revokedAt?: string | Date | null;
  createdAt: string | Date;
}
