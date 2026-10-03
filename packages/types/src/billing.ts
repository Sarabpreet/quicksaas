export type PlanTier = "free" | "pro" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

export interface EntitlementLimits {
  maxMembers: number;
  maxApiKeys: number;
  maxDynamicResources: number;
  maxStorageMb: number;
  customWebhooksEnabled: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  entitlements: EntitlementLimits;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
}

export interface TenantSubscription {
  id: string;
  organizationId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  resource: string;
  currentUsage: number;
  limit: number;
  plan: PlanTier;
  reason?: string;
}
