import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const jobRecords = pgTable("job_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  queueName: text("queue_name").default("default").notNull(),
  name: text("name").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  status: text("status").default("pending").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  lastError: text("last_error"),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type JobRecord = typeof jobRecords.$inferSelect;
export type NewJobRecord = typeof jobRecords.$inferInsert;
