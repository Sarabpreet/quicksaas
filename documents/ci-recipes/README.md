# QuickSaaS - CI/CD Recipes (Unopinionated & Pluggable)

QuickSaaS follows the **"Primitives Over Pipelines"** philosophy. 

The kernel does not force a rigid or vendor-locked CI/CD system onto your project. Instead, QuickSaaS provides clean, exit-code-aware CLI commands that you can execute in **any** CI/CD runner, deployment engine, or local pre-commit hook.

---

## 🧱 The Core CLI Primitives

Every CI/CD platform is fundamentally a machine that executes shell commands and checks exit codes (`0` = pass, non-zero = fail). 

QuickSaaS exposes these standardized primitives in the root `package.json`:

| Command | Exit Code Behavior | Use in Pipeline |
| :--- | :--- | :--- |
| `npm run build` | Exits `0` if TypeScript & Vite build cleanly across all packages; `1` on error. | Quality Gate: Typecheck & production bundling |
| `npm test` | Exits `0` if all 68 unit & integration tests pass; `1` on any failure. | Quality Gate: Business logic & security tests |
| `npm run test:e2e` | Exits `0` if all Playwright cross-app browser journeys pass; `1` on failure. | Quality Gate: Live end-to-end integration |
| `npm run db:migrate` | Applies pending Drizzle schema migrations to database. | Deployment: Schema provisioning |
| `npm run backup` | Captures point-in-time snapshot with SHA-256 verification. | Pre-deployment: Automated rollback safeguard |

---

## 📖 Pick Your Drop-In Recipe

Choose the recipe matching your team's stack:

1. **[GitHub Actions Recipe](github-actions.md)**: Drop-in `.github/workflows/ci.yml` with dependency caching and parallel test jobs.
2. **[GitLab CI Recipe](gitlab-ci.md)**: Drop-in `.gitlab-ci.yml` with staged test and build steps.
3. **[VPS & Docker / Coolify Recipe](docker-vps.md)**: Direct deployment recipe for single-server VPS setups without third-party CI services.
