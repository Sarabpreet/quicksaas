import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }), // null = system wide setting
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
