# ADR-0006: Unopinionated CI/CD: CLI Primitives Over Forced Pipelines

## Context
Many SaaS boilerplates ship with hard-coded CI/CD pipeline configurations (e.g., rigid `.github/workflows/deploy.yml` files). When developers adopt the boilerplate, they frequently encounter friction:
- Developers using GitLab CI, Bitbucket Pipelines, Woodpecker, Jenkins, or self-hosted Drone must delete or refactor proprietary GitHub Actions files.
- The pipeline often assumes specific hosting platforms (Vercel, Supabase, Render), forcing unwanted infrastructure choices on teams deploying to bare-metal VPS, Hetzner, Coolify, or AWS ECS.

## Decision
We adopt an **Unopinionated, Primitive-First CI/CD Philosophy**:
1. **Repository Primitives**:
   - The root repository and template outputs do not impose vendor-locked `.github/workflows` files by default.
   - All CI/CD operations are represented by standard, exit-code-aware npm scripts:
     - `npm run build`: Type-checks and compiles all packages.
     - `npm test`: Runs full test suites across all packages.
     - `npm run test:e2e`: Runs cross-application Playwright journeys.
     - `npm run backup`: Generates disaster recovery snapshots.
     - `npm run db:migrate`: Executes database schema migrations.
2. **Pluggable Recipes Hub**:
   - Production pipeline configurations are documented as modular recipes in `documents/ci-recipes/`:
     - `github-actions.md`: Complete GitHub Actions matrix and deployment workflow.
     - `gitlab-ci.md`: Complete `.gitlab-ci.yml` pipeline stages.
     - `docker-vps.md`: Direct VPS, Coolify, and Dokku deployment scripts with automated rollback.
3. **Interactive Installer Customization**:
   - The interactive installer CLI (`npm run create-saas`) explicitly prompts the developer for their preferred CI/CD platform (`none`, `github`, `gitlab`) and generates the appropriate workflow only when chosen.

## Consequences
- **Positive**: Complete freedom of deployment target and CI runner.
- **Positive**: Clean, uncluttered repository root without unwanted vendor files.
- **Positive**: Instant turnkey pipeline generation via the interactive CLI wizard when requested.
- **Negative**: Developers opting not to use the installer wizard must copy their preferred recipe from `documents/ci-recipes/`.
