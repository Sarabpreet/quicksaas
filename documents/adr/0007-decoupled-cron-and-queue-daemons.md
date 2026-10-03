# ADR-0007: Decoupled Background Workers & Cron Scheduling Daemons

## Context
In early SaaS prototypes, background jobs (sending transactional emails, dispatching webhooks, generating backups) and recurring cron jobs (cleaning expired tokens, billing renewals) are often executed inside `setInterval()` or `setTimeout()` timers embedded directly within the HTTP API server process.
While simple initially, this approach breaks down quickly in production:
1. **HTTP Event Loop Starvation**: Heavy background tasks (such as database archiving or batch email rendering) block the single Node.js event loop, degrading API response times and throughput.
2. **Horizontal Scaling Pitfalls**: Scaling the HTTP API server to multiple instances results in multiple instances of the scheduler firing concurrently, causing duplicate emails, race conditions, and duplicate cron backups.
3. **Independent Failure Modes**: An out-of-memory error or crash in a background task should never bring down customer-facing API availability.

## Decision
We decouple queue processing and periodic scheduling into a dedicated workspace: `cron/`:
1. **Standalone Queue Worker (`cron/worker.ts`)**:
   - Runs as an independent daemon polling Redis queue lists (`queue:default`, `queue:email`, `queue:webhooks`) with database polling fallback via `job_records`.
   - Handles retries, attempts, error capturing (`lastError`), and failure exhaustion marking.
   - Can be scaled horizontally across multiple worker containers without impacting API servers.
2. **Recurring Cron Scheduler (`cron/scheduler.ts`)**:
   - Evaluates periodic task definitions (`cleanup.expired_invites`, `backup.create`) on precise interval ticks.
   - Pushes scheduled tasks into the job queue rather than executing heavy task logic directly on the timer thread.
3. **Unified Daemon Runner (`cron/index.ts`)**:
   - Supports single-process execution for small servers (worker + scheduler concurrently), or isolated `--worker-only` / `--scheduler-only` modes for Kubernetes or containerized production clusters.
   - Accessible via root scripts: `npm run worker` and `npm run cron`.

## Consequences
- **Positive**: High API reliability. Heavy background processing cannot starve HTTP traffic.
- **Positive**: Seamless horizontal scaling. Web servers and queue workers scale independently based on demand.
- **Positive**: Single-tick deduplication. Cron intervals push jobs to the queue, ensuring each scheduled task is executed exactly once by an available worker.
- **Negative**: Adds a separate daemon process to manage in production environments.
