import { pgTable, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { resourceDefinitions } from "./resource_definitions.js";

export const dynamicEntities = pgTable(
  "dynamic_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resourceDefinitions.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, any>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("org_resource_entity_idx").on(table.organizationId, table.resourceId),
  ]
);

export type DynamicEntity = typeof dynamicEntities.$inferSelect;
export type NewDynamicEntity = typeof dynamicEntities.$inferInsert;
