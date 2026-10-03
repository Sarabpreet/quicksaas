import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }), // null = global feature flag
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
