# ADR-0002: Zero-Docker Local Development with Embedded PGlite

## Context
Traditional SaaS starter kits and backend boilerplates require developers to install, configure, and maintain containerized databases (Docker, Docker Desktop, Colima) before writing or running a single line of code. This introduces significant onboarding friction:
- Heavy RAM and CPU consumption by daemon virtualization.
- Broken developer experiences on machines with restrictive permissions or missing Docker installations.
- Flaky CI test runs caused by Docker daemon timeouts and port collision errors.

## Decision
We adopt **PGlite** (`@electric-sql/pglite`) as the default database runtime for local development and test execution.
- If `DATABASE_URL` is omitted or set to local defaults, QuickSaaS boots an embedded, WebAssembly-powered PostgreSQL instance storing data locally under `.data/postgres/`.
- If `DATABASE_URL` is provided (e.g., `postgres://user:pass@host:5432/dbname`), the system transparently swaps the database driver to standard `postgres` (postgres-js) connecting to external production PostgreSQL (AWS RDS, Neon, Supabase, self-hosted Docker).
- Drizzle ORM provides a unified query and migration layer (`drizzle-orm/pglite` and `drizzle-orm/postgres-js`), ensuring identical SQL execution semantics across both environments.

## Consequences
- **Positive**: Zero-Docker instant start. A developer clones the repo, runs `npm install && npm test`, and all 70+ tests run in seconds without installing Docker.
- **Positive**: Portable test isolation. Test suites run against dedicated in-process database instances without port collisions or credential management.
- **Positive**: Zero code divergence between development and production because PGlite runs true PostgreSQL C source code compiled to WASM.
- **Negative**: PGlite uses single-process file locking on `.data/postgres/`. Multiple concurrent uncoordinated processes cannot write to the same SQLite-style directory simultaneously without coordination (resolved via sequential test execution and `postmaster.pid` cleanup).
