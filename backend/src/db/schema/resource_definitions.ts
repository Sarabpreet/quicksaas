import { pgTable, uuid, text, timestamp, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export interface FieldDefinition {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "json";
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
}

export const resourceDefinitions = pgTable(
  "resource_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Customer"
    slug: text("slug").notNull(), // e.g. "customers"
    description: text("description"),
    fields: jsonb("fields").$type<FieldDefinition[]>().default([]).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("org_resource_slug_idx").on(table.organizationId, table.slug),
  ]
);

export type ResourceDefinition = typeof resourceDefinitions.$inferSelect;
export type NewResourceDefinition = typeof resourceDefinitions.$inferInsert;
