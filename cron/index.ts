import { startWorker } from "./worker.js";
import { startScheduler } from "./scheduler.js";

async function main() {
  const args = process.argv.slice(2);
  const workerOnly = args.includes("--worker-only");
  const schedulerOnly = args.includes("--scheduler-only");

  console.log(`\n⚙️  QuickSaaS Background Services Daemon (cron/)`);
  console.log(`====================================================`);

  if (workerOnly) {
    console.log(`Mode: Worker Only\n`);
    await startWorker();
  } else if (schedulerOnly) {
    console.log(`Mode: Scheduler Only\n`);
    await startScheduler();
  } else {
    console.log(`Mode: Worker + Scheduler (Concurrent)\n`);
    await Promise.all([
      startWorker({ intervalMs: 1500 }),
      startScheduler(60000),
    ]);
  }
}

main().catch((err) => {
  console.error("Fatal daemon error:", err);
  process.exit(1);
});
