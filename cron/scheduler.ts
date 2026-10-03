import { eq, and, desc, lte } from "drizzle-orm";
import { db } from "../backend/src/db/client.js";
import { jobRecords } from "../backend/src/db/schema/index.js";
import { redis, isRedisReady } from "../backend/src/redis/client.js";

export interface ScheduledTask {
  id: string;
  name: string;
  queueName: string;
  intervalMinutes: number;
  lastRunAt?: Date;
  payload?: Record<string, any>;
}

export const registeredTasks: ScheduledTask[] = [
  {
    id: "task_cleanup_invites",
    name: "cleanup.expired_invites",
    queueName: "default",
    intervalMinutes: 60, // Hourly
  },
  {
    id: "task_daily_backup",
    name: "backup.create",
    queueName: "default",
    intervalMinutes: 1440, // 24 Hours
    payload: { label: "Automated Daily Cron Backup" },
  },
];

/**
 * Enqueue a task to the queue
 */
export async function enqueueJob(name: string, payload: Record<string, any> = {}, queueName = "default") {
  const [job] = await db
    .insert(jobRecords)
    .values({
      name,
      queueName,
      payload,
      status: "pending",
    })
    .returning();

  if (isRedisReady()) {
    try {
      await redis.lpush(`queue:${queueName}`, JSON.stringify({ jobId: job.id, name, payload }));
    } catch {}
  }

  return job;
}

/**
 * Executes a single scheduler tick, checking all registered tasks
 */
export async function runSchedulerTick(now = new Date()): Promise<number> {
  let tasksTriggered = 0;

  for (const task of registeredTasks) {
    const isDue =
      !task.lastRunAt ||
      now.getTime() - task.lastRunAt.getTime() >= task.intervalMinutes * 60 * 1000;

    if (isDue) {
      console.log(`[Scheduler] ⏰ Triggering scheduled task: '${task.name}' (Interval: ${task.intervalMinutes}m)`);
      try {
        await enqueueJob(task.name, task.payload || {}, task.queueName);
        task.lastRunAt = now;
        tasksTriggered++;
      } catch (err: any) {
        console.error(`[Scheduler] ❌ Failed to enqueue task '${task.name}':`, err.message);
      }
    }
  }

  return tasksTriggered;
}

/**
 * Starts continuous scheduler daemon
 */
export async function startScheduler(intervalMs = 60000) {
  let isRunning = true;

  console.log(`\n⏰ QuickSaaS Recurring Cron Scheduler Started`);
  console.log(`====================================================`);
  console.log(`   Registered Tasks : ${registeredTasks.length}`);
  registeredTasks.forEach((t) => {
    console.log(`     - ${t.name.padEnd(25)} (Every ${t.intervalMinutes} min)`);
  });
  console.log(`   Tick Interval    : ${intervalMs / 1000}s`);
  console.log(`====================================================\n`);

  const shutdown = () => {
    console.log("\n[Scheduler] Shutting down scheduler daemon...");
    isRunning = false;
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Initial immediate tick
  await runSchedulerTick();

  while (isRunning) {
    await new Promise((res) => setTimeout(res, intervalMs));
    if (isRunning) {
      await runSchedulerTick();
    }
  }
}

if (process.argv[1]?.endsWith("scheduler.ts") || process.argv[1]?.endsWith("scheduler.js")) {
  startScheduler().catch((err) => {
    console.error("Fatal scheduler error:", err);
    process.exit(1);
  });
}
