import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" })
    .unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull().default("free"), // "free" | "pro" | "enterprise"
  status: text("status").notNull().default("active"), // "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete"
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stripeInvoiceId: text("stripe_invoice_id"),
  amountDue: integer("amount_due").notNull().default(0), // in cents
  amountPaid: integer("amount_paid").notNull().default(0), // in cents
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("paid"), // "paid" | "open" | "void" | "uncollectible"
  invoicePdf: text("invoice_pdf"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
