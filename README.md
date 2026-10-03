# QuickSaaS - Zero-Docker Modern SaaS Monorepo

QuickSaaS is a full-stack, headless, multi-tenant SaaS foundation engineered for high developer velocity. It eliminates complex container dependencies by running embedded PostgreSQL (PGlite) and local Redis right out of the box, with seamless production deployment to any cloud via Docker, Kubernetes, or bare-metal VPS.

---

## 🏛️ Monorepo Architecture

```text
quicksaas/
├── backend/            # Fastify REST API, Drizzle ORM, PGlite, Redis, Kernel Modules (Port 4000)
├── admin/              # Superadmin Operations Portal (React 19, Vite, Tailwind v4) (Port 5173)
├── frontend/           # Customer Tenant Web Application (React 19, Vite, Tailwind v4) (Port 3001)
├── cron/               # Standalone Queue Worker & Recurring Cron Scheduler Daemon
├── packages/           # Monorepo shared packages (@quicksaas/types)
├── infra/              # Production container orchestration (Docker Compose, Dockerfiles, Caddy, Nginx)
├── e2e/                # Playwright coordinated cross-application browser journeys
└── documents/          # Architecture blueprints, specs, and execution logs
    ├── adr/            # Formal Architecture Decision Records (ADRs 0001 - 0007)
    ├── ci-recipes/     # Modular CI/CD recipes (GitHub Actions, GitLab CI, Docker VPS)
    ├── TEMPLATES.md    # Turnkey vertical templates specification
    ├── GSD_LOG.md      # Detailed Get Shit Done (GSD) build & execution log
    └── quicksaas.md    # Master architecture blueprint
```

---

## ⚡ Quick Start (Zero-Docker)

### 1. Install Monorepo Dependencies
From the repository root:
```bash
npm install
```

### 2. Database Migrations & Seeding
Prepare the embedded database and create initial accounts:
```bash
# Apply Drizzle migrations to backend/.data/postgres
npm run db:migrate

# Seed demo superadmin and customer accounts
npm run db:seed
```

### 3. Launch the Full Stack
Boot the backend, admin portal, and customer app concurrently:
```bash
npm run dev
```

The system will start 3 coordinated services:
- **Backend API**: [http://localhost:4000](http://localhost:4000) (Interactive Swagger Docs at `/documentation`)
- **Admin Portal**: [http://localhost:5173](http://localhost:5173)
- **Customer App**: [http://localhost:3001](http://localhost:3001)

To run the background queue worker and recurring cron scheduler:
```bash
npm run cron
```

---

## 🔑 Demo Login Accounts

All frontends include 1-click preset login buttons for immediate testing:

| Application | Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Portal** | Superadmin | `superadmin@quicksaas.dev` | `AdminPass123!` | Global platform analytics, organizations, users, system jobs |
| **Customer App** | Workspace Owner | `founder@startup.io` | `StartupPass123!` | Full tenant CRUD, team invites, file uploads, developer API keys |
| **Customer App** | Viewer Member | `viewer@startup.io` | `ViewerPass123!` | Read-only tenant access with automated mutation locks |

---

## 🚀 Copy-First SaaS Scaffolder (`npm run create-saas`)

QuickSaaS is built around a **Copy-First Architecture** (Quality Gate G7 / Critical Scenario #12). Run the interactive installer to clone, brand, and specialize the entire kernel into a customized vertical SaaS:

```bash
npm run create-saas
```

**The interactive installer guides you through:**
1. **Application Branding**: App Name, URL slug, description, and official GitHub repository URL.
2. **Tailwind CSS Theme Synchronization**: Prompts for your brand color hex (e.g. `#0ea5e9` Sky Blue, `#10b981` Emerald, `#6366f1` Indigo). Derives hover and active shades and injects a `@theme` configuration into both `admin/src/index.css` and `frontend/src/index.css`.
3. **Storage Settings (EC2 EBS vs AWS S3)**: Choose local disk / EBS volume path (e.g. `./storage`) or AWS S3 / MinIO object storage.
4. **First Admin User Provisioning**: Captures custom Superadmin name, email, password, and workspace name.
5. **CI/CD Platform**: Choose between unopinionated (`none`), GitHub Actions, or GitLab CI.
6. **Environment Generation**: Pre-populates a comprehensive `.env` file ready for first-boot seeding.

**Non-Interactive / CI Scaffolding:**
```bash
npm run create-saas ../my-saas -- --yes \
  --name="TaskPulse" \
  --color="#0ea5e9" \
  --repo="https://github.com/myorg/taskpulse" \
  --template="feedback-hub" \
  --ci="github" \
  --admin-email="founder@taskpulse.io" \
  --admin-password="SecurePassword123!" \
  --org="TaskPulse Labs"
```

---

## 🔐 Admin Password Reset Utility (`npm run admin:reset-password`)

If you ever need to reset or regenerate superadmin credentials directly from the terminal without manual SQL queries:

```bash
npm run admin:reset-password
```

Supports interactive prompts, random 24-character password generation (`--generate`), or non-interactive flags (`--email=... --password=...`).

---

## 🐳 Production Infrastructure (`infra/`)

Deploy QuickSaaS to any server or cloud VPS with container orchestration:

```bash
# Option A: Complete Standalone Production Stack (Postgres, Redis, MinIO, Backend, Cron, Admin, Frontend, Caddy Proxy)
docker compose -f infra/docker-compose.yml up -d --build

# Option B: Local Dependencies Only (Runs Postgres, Redis, MinIO in Docker while you run npm run dev on host)
docker compose -f infra/docker-compose.deps-only.yml up -d
```

👉 Read the full [Infrastructure & Deployment Runbook](infra/README.md) for architecture diagrams and VPS deployment guides.

---

## 🛠️ Monorepo Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs backend, admin, and frontend simultaneously with colored terminal prefixes |
| `npm run dev:backend` | Runs only the Fastify API in watch mode (`:4000`) |
| `npm run dev:admin` | Runs only the Admin Portal (`:5173`) |
| `npm run dev:frontend` | Runs only the Customer Workspace App (`:3001`) |
| `npm run worker` | Runs the standalone background queue worker daemon |
| `npm run cron` | Runs the unified background worker + recurring cron scheduler daemon |
| `npm run create-saas` | Launches the interactive SaaS creator & project scaffolder |
| `npm run admin:reset-password` | Resets or regenerates superadmin password via CLI |
| `npm run backup` | Captures an on-demand, SHA-256 verified point-in-time snapshot of the database and files |
| `npm run restore` | Restores the database and tenant files from a snapshot archive |
| `npm test` | Executes all 73 automated unit & integration tests across all 4 workspaces |
| `npm run test:e2e` | Runs all 6 Playwright cross-application browser journeys against live servers |
| `npm run build` | Compiles TypeScript and builds production bundles for all packages |
| `npm run db:migrate` | Runs Drizzle migrations against the configured database |
| `npm run db:seed` | Populates demo data or custom credentials from `.env` |
| `npm run db:studio` | Launches Drizzle Studio GUI for visual database inspection |

---

## 🧪 Automated Test Coverage (73 / 73 Tests + 6 / 6 Playwright Journeys)

- **Backend Kernel & Reference SaaS Tests (30 Tests in `backend/src/tests/`)**:
  - System health check & Redis connectivity probe
  - Multi-tenant auth & tenant isolation verification
  - RBAC permission enforcement (`owner`, `admin`, `member`, `viewer`)
  - API Studio dynamic collection creation, search, filtering, and 1-click Drizzle code promotion
  - File uploads & streaming authenticated downloads with cross-tenant isolation
  - In-app notification creation & bulk mark-as-read
  - Webhook registration, HMAC-SHA256 signing, and delivery logs
  - Background jobs queue, worker runner, and retry logic
  - Stripe subscription engine, checkout simulation, webhooks, and tiered capacity gating
  - Disaster Recovery snapshot creation, manifest checksum verification, and 1-click restore
  - Reference Vertical SaaS: Turnkey FeedbackPulse lifecycle (posts, upvotes, status transitions, roadmaps)
- **Admin Portal Tests (21 Tests in `admin/src/test/`)**:
  - Superadmin authentication & demo autofill
  - Navigation, sidebar links, and active health indicators
  - Schema builder modal & 1-click code promotion preview
  - Dynamic data table explorer
  - System operations (background jobs, webhooks, feature flags, audit trail)
  - Multi-tenant organizations directory & global user search filtering
  - Tenant settings JSON editor & transactional email template previews
  - Disaster Recovery & snapshot restoration modal
- **Customer App Tests (17 Tests in `frontend/src/test/`)**:
  - Tenant authentication & workspace signup
  - Tenant organization switcher & dynamic navigation menu
  - Notification drawer, unread counter, and mark-all-read action
  - Dynamic collection record creation, editing, and viewer mutation locks
  - Team member roster & invite token generator
  - Developer API key generator & raw secret token reveal
  - Organization file storage browser & streaming download
  - Self-service Stripe billing portal & capacity progress meters
  - Profile display name updates and password change flows
- **Background Worker & Cron Tests (5 Tests in `cron/worker.test.ts`)**:
  - Transactional email dispatch & mustache template rendering
  - Webhook dispatch with HMAC-SHA256 signature calculation
  - Job failure handling, attempt incrementing, retry loop, and exhaustion marking
  - Stale tenant invitation token cleanup
  - Recurring scheduler tick evaluation and task deduplication
- **Playwright Multi-App E2E Journeys (`e2e/` - 6 Journeys)**:
  - Cross-application coordinated tests spanning Superadmin, Tenant Admin, RBAC Viewer, Audit trails, Billing upgrades, and Disaster recovery.

---

## 📚 Documentation & Architecture Decisions

- [Master Architecture Blueprint](quicksaas.md)
- [Architecture Decision Records (ADRs 0001 - 0007)](documents/adr/README.md)
- [Unopinionated CI/CD Recipes](documents/ci-recipes/README.md)
- [Vertical SaaS Templates Specification](documents/TEMPLATES.md)
- [Infrastructure & Deployment Guide](infra/README.md)
- [Execution & Implementation Log](documents/GSD_LOG.md)
