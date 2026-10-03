import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }), // null = system-wide default template
  name: text("name").notNull(), // e.g. "welcome_user", "password_reset", "invite"
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  variables: jsonb("variables").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  toAddress: text("to_address").notNull(),
  templateName: text("template_name"),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("queued"), // 'queued' | 'sent' | 'failed'
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
