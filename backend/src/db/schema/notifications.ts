import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // 'info' | 'success' | 'warning' | 'error'
  link: text("link"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
