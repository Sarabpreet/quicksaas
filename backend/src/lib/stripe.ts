import Stripe from "stripe";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  subscriptions,
  invoices,
  memberships,
  resourceDefinitions,
  files,
  apiKeys,
  organizations,
} from "../db/schema/index.js";
import { logAuditEvent } from "./audit.js";

// Initialize Stripe SDK if key is provided
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
export const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" as any })
  : null;

export interface PlanConfig {
  id: "free" | "pro" | "enterprise";
  name: string;
  description: string;
  priceMonthly: number; // in USD
  stripePriceId: string;
  maxMembers: number; // -1 for unlimited
  maxResources: number;
  maxStorageBytes: number;
  maxApiKeys: number;
  features: string[];
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Starter",
    description: "Essential primitives for early prototypes and indie developers.",
    priceMonthly: 0,
    stripePriceId: process.env.STRIPE_PRICE_FREE || "price_free_tier",
    maxMembers: 3,
    maxResources: 3,
    maxStorageBytes: 50 * 1024 * 1024, // 50 MB
    maxApiKeys: 2,
    features: [
      "Up to 3 team collaborators",
      "3 dynamic data collections",
      "50 MB tenant file storage",
      "2 developer API keys",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Growth (Pro)",
    description: "High-scale capacity, unlimited API access, and advanced operational tools.",
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_PRO || "price_pro_monthly_49",
    maxMembers: 15,
    maxResources: 15,
    maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    maxApiKeys: 15,
    features: [
      "Up to 15 team collaborators",
      "15 dynamic data collections",
      "5 GB tenant file storage",
      "15 developer API keys",
      "1-click code promotion to Drizzle",
      "Redis background queues & retries",
      "Priority webhook dispatching",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Scale (Enterprise)",
    description: "Unlimited scale, dedicated SLA, custom schemas, and audit compliance.",
    priceMonthly: 199,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise_monthly_199",
    maxMembers: -1, // Unlimited
    maxResources: -1,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    maxApiKeys: -1,
    features: [
      "Unlimited team collaborators",
      "Unlimited dynamic data collections",
      "100 GB tenant file storage",
      "Unlimited developer API keys",
      "Full immutable audit trail export",
      "Dedicated worker queue priority",
      "99.9% uptime SLA & dedicated support",
    ],
  },
};

export function getPlanConfig(planId: string = "free"): PlanConfig {
  return PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS);
}

export interface OrganizationUsage {
  membersCount: number;
  resourcesCount: number;
  storageBytes: number;
  apiKeysCount: number;
}

export async function getOrganizationUsage(organizationId: string): Promise<OrganizationUsage> {
  const [membersCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(memberships)
    .where(eq(memberships.organizationId, organizationId));

  const [resourcesCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(resourceDefinitions)
    .where(eq(resourceDefinitions.organizationId, organizationId));

  const [storageBytesResult] = await db
    .select({ sum: sql<number>`coalesce(sum(${files.sizeBytes}), 0)` })
    .from(files)
    .where(eq(files.organizationId, organizationId));

  const [apiKeysCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId));

  return {
    membersCount: Number(membersCountResult?.count || 0),
    resourcesCount: Number(resourcesCountResult?.count || 0),
    storageBytes: Number(storageBytesResult?.sum || 0),
    apiKeysCount: Number(apiKeysCountResult?.count || 0),
  };
}

export async function getOrCreateSubscription(organizationId: string) {
  let sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
  });

  if (!sub) {
    const [newSub] = await db
      .insert(subscriptions)
      .values({
        organizationId,
        plan: "free",
        status: "active",
      })
      .returning();
    sub = newSub;
  }

  return sub;
}

export async function checkPlanEntitlement(
  organizationId: string,
  metric: "members" | "resources" | "storage" | "api_keys",
  increment: number = 1
): Promise<{ allowed: boolean; limit: number; current: number; error?: string }> {
  const sub = await getOrCreateSubscription(organizationId);
  const plan = getPlanConfig(sub.plan);
  const usage = await getOrganizationUsage(organizationId);

  let limit = -1;
  let current = 0;
  let metricLabel = "";

  switch (metric) {
    case "members":
      limit = plan.maxMembers;
      current = usage.membersCount;
      metricLabel = "team members";
      break;
    case "resources":
      limit = plan.maxResources;
      current = usage.resourcesCount;
      metricLabel = "dynamic data collections";
      break;
    case "storage":
      limit = plan.maxStorageBytes;
      current = usage.storageBytes;
      metricLabel = "storage capacity";
      break;
    case "api_keys":
      limit = plan.maxApiKeys;
      current = usage.apiKeysCount;
      metricLabel = "developer API keys";
      break;
  }

  if (limit !== -1 && current + increment > limit) {
    return {
      allowed: false,
      limit,
      current,
      error: `Plan limit exceeded: Your current ${plan.name} plan permits up to ${limit} ${metricLabel}. Please upgrade your plan.`,
    };
  }

  return { allowed: true, limit, current };
}
