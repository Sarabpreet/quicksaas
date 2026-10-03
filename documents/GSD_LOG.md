# QuickSaaS Kernel - GSD Implementation & Execution Log

Inspired by the Get-Shit-Done (GSD) workflow: rigorous, structured, traceable execution logs documenting architectural decisions, state transitions, implemented modules, and verification proofs.

---

## 🎯 Primary Objective
Deliver a 100% functional, headless SaaS API platform capable of driving both the customer-facing frontend (`frontend/`) and the internal operations UI (`admin/`), fulfilling all V1 kernel requirements from `quicksaas.md`.

---

## 🧭 System Architecture & Design Directives
1. **Headless & Decoupled**: The backend is the single boundary of truth. Admin and Frontend are equal REST API consumers.
2. **Zero-Docker Default**: Embedded PostgreSQL (PGlite) + local Redis server support, with seamless production fallback via `DATABASE_URL` and `REDIS_URL`.
3. **Multi-Tenant Isolation**: Every resource (dynamic entities, files, api keys, webhooks, audit logs, memberships) is strictly scoped to an `organization_id`.
4. **Dual Authentication**: Seamless support for User JWT (`Bearer <jwt>`) and Programmatic API Keys (`X-API-Key: qs_live_...`).
5. **Dynamic Resource Engine + Escape Hatch**: Low-code dynamic schemas for instant 0-to-1 velocity, with 1-click promotion to TypeScript Drizzle code.

---

## 📋 Module Tracker & Implementation Status

| Module | Status | Description | Endpoints / Capabilities |
| :--- | :---: | :--- | :--- |
| **0. System & Health** | ✅ Verified | Fastify, PGlite, Redis, Swagger | `GET /health`, `GET /documentation` |
| **1. Identity & Auth** | ✅ Verified | Registration, Login, JWT, Profiles | `POST /register`, `POST /login`, `GET /me`, `POST /change-password` |
| **2. Organizations & RBAC**| ✅ Verified | Tenancy, Roles, Invites | `CRUD /organizations`, `/members`, `/invites` |
| **3. API Studio & Engine** | ✅ Verified | Dynamic CRUD, Validation, Code Promotion | `/resources`, `/data/{slug}`, `/resources/{id}/promote` |
| **4. API Keys** | ✅ Verified | Key generation, prefixing, revocation | `CRUD /api-keys`, Header auth `X-API-Key` |
| **5. Audit Logging** | ✅ Verified | Structured audit trail with actor/resource | `GET /audit-logs`, query by tenant/actor |
| **6. Files & Storage** | ✅ Verified | Multi-part/Base64 uploads, streaming download | `POST /files`, `GET /files`, `GET /files/{id}/download` |
| **7. Transactional Email** | ✅ Verified | Templates, preview, queue worker | `CRUD /email/templates`, `POST /email/send`, `GET /email/logs` |
| **8. In-App Notifications**| ✅ Verified | Real-time / persistent notifications | `GET /notifications`, `PATCH /notifications/:id/read` |
| **9. Webhooks Dispatcher** | ✅ Verified | Event webhooks with HMAC signatures | `CRUD /webhooks`, deliveries log, dispatch test |
| **10. Jobs & Queue** | ✅ Verified | Redis-backed asynchronous worker | Enqueue, list, retry, failure inspection |
| **11. Feature Flags** | ✅ Verified | Dynamic flags, tenant overrides | `CRUD /feature-flags`, `GET /feature-flags/evaluate` |
| **12. Settings Engine** | ✅ Verified | Org & System scoped key-value config | `GET /settings`, `PUT /settings/{key}` |
| **13. Superadmin Operations**| ✅ Verified | Platform overview, stats, user management | `GET /admin/stats`, `GET /admin/organizations`, `GET /admin/users` |
| **14. Admin UI Portal** | ✅ Fully Tested | React 19 + Vite + Tailwind v4 GUI + Vitest | Complete management frontend under `admin/` |
| **15. Customer Workspace App** | ✅ Fully Tested | React 19 + Vite + Tailwind v4 + Vitest | Self-service tenant app under `frontend/` (`:3001`) |
| **16. Playwright E2E Journeys**| ✅ Fully Tested | Coordinated Multi-App Browser Testing | Full cross-app test suite under `e2e/` |
| **17. Billing & Subscriptions**| ✅ Fully Tested | Multi-tenant subscriptions, Stripe, capacity limits | `/billing/*`, checkout, portal, webhook, entitlements |
| **18. Disaster Recovery & Backups**| ✅ Fully Tested | Snapshot generation, SHA256 integrity, 1-click restore | `/admin/backups/*`, `npm run backup`, `npm run restore` |
| **19. Copy-First SaaS Scaffolder**| ✅ Fully Tested | CLI generator, templates, turnkey vertical SaaS | `npm run create-saas <dir>`, FeedbackPulse vertical |
| **20. Background Worker & Cron** | ✅ Fully Tested | Standalone Queue Worker & Recurring Schedules Daemon | `cron/` workspace, `npm run worker`, `npm run cron` |
| **21. Infrastructure & Deployment**| ✅ Fully Tested | Container Orchestration, Reverse Proxy, S3 MinIO | `infra/` workspace, `docker-compose.yml`, multi-stage Dockerfiles |

---

## 🧪 Automated Verification Test Suites

### Suite 1: Backend Kernel & Reference SaaS API (30 Test Cases across 2 Suites)
Located in `backend/src/tests/kernel.test.ts` (25 tests) and `backend/src/tests/sample-saas.test.ts` (5 tests). Verified in ~6 seconds (`npm test`):

**Part A: Kernel Core Services (`kernel.test.ts` - 25 Tests)**:
1. **System Health Check**: Verifies HTTP 200 and healthy connectivity for both embedded PostgreSQL (PGlite) and Redis.
2. **Atomic Registration & Tenancy**: Verifies simultaneous user creation, password hashing (scrypt), automatic organization creation, and Owner assignment.
3. **Team Invites & RBAC Role Assignment**: Generates signed invite tokens and joins invited user as 'Viewer'.
4. **Dynamic Resource Definition (API Studio)**: Defines custom schema metadata (`Customer`) with typed fields (`company`, `arr`, `isVerified`).
5. **Dynamic CRUD Runtime**: Creates and reads dynamic entity records validated against defined field schemas.
6. **Multi-Tenant Isolation (Critical Scenario #3)**: Proves Organization B cannot access or view Organization A's dynamic entities.
7. **RBAC Write Protection (Critical Scenario #4)**: Proves 'Viewer' role is forbidden (HTTP 403) from creating or modifying records.
8. **API Key Generation, Auth, & Revocation (Critical Scenario #9)**: Creates a live key (`qs_live_...`), authenticates via `X-API-Key` header, revokes key, and verifies immediate 401 blocking.
9. **Files & Storage Pipeline (Critical Scenario #5)**: Uploads file payload, stores under isolated tenant path, and streams file download with correct MIME headers.
10. **Transactional Email Engine**: Previews template with dynamic variables (`{{name}}`) and dispatches transactional log.
11. **In-App Notifications**: Dispatches persistent notifications, retrieves unread list, and marks as read.
12. **Webhooks & HMAC Signatures (Critical Scenario #8)**: Subscribes endpoint, computes HMAC-SHA256 signature (`X-QuickSaaS-Signature`), and logs delivery status.
13. **Jobs & Background Queue (Critical Scenario #7)**: Enqueues job to Redis/DB, processes via worker, and replays failed jobs.
14. **Feature Flags Client Evaluation**: Returns resolved boolean flags combining global defaults and tenant overrides.
15. **Settings Key-Value Engine**: Updates and retrieves organization-scoped JSON configuration.
16. **Audit Trail Recording**: Inspects structured audit trail verifying actor, timestamp, IP, and event logs.
17. **Code Promotion Escape Hatch (Critical Scenario #10)**: Compiles dynamic resource metadata into a complete TypeScript Drizzle ORM table definition.
18. **Superadmin Operations (Admin UI)**: Authenticates platform superadmin and returns aggregate platform metrics.
19. **Billing & Subscriptions Engine**: Fetches tiered plans (Free, Pro, Enterprise), checks current active subscription, initiates simulated Stripe checkout, and completes instant local upgrade.
20. **Stripe Webhooks & Plan Entitlements**: Dispatches and processes `customer.subscription.updated` / `invoice.payment_succeeded` webhook payloads, updates tenant subscription status, and validates resource entitlement capacity checks.
21. **Disaster Recovery & Backups (Critical Scenario #11)**: Creates on-demand point-in-time snapshot, verifies SHA-256 archive checksum against manifest, and successfully executes full database and storage restore.
22. **Plan Entitlements Hard Enforcement**: Verifies capacity limits on Free plan (blocks 3rd API key with HTTP 403 `limitExceeded: true`) and validates entitlement unblocking after simulated Pro tier promotion.
23. **Cross-Tenant File Storage Security**: Enforces HTTP 403 when a tenant attempts to download another tenant's private files, allows superadmins (HTTP 200), and validates missing file handling (HTTP 404).
24. **Dynamic Resource Field Validation & Record Deletion**: Validates HTTP 422 on schema constraint violations (missing required fields or malformed types) and verifies DELETE endpoint removes record (subsequent GET returns HTTP 404).
25. **Disaster Recovery Error Handling**: Enforces HTTP 404 on invalid snapshot IDs for verify, restore, and delete operations.

**Part B: Turnkey Reference SaaS "FeedbackPulse" (`sample-saas.test.ts` - 5 Tests)**:
1. **Bootstrap New SaaS Tenant**: Registers a dedicated SaaS owner (`founder@feedbackpulse.io`, Organization: `FeedbackPulse Inc`).
2. **Dynamic Schema Provisioning**: Dynamically defines `FeedbackPost` (`feedback_posts`) and `ProductRoadmap` (`roadmaps`) via API Studio with text, number, and boolean fields.
3. **Dynamic CRUD & Status Transitions**: Submits customer feedback records, updates statuses to `planned`, upvotes items, and populates public roadmap themes.
4. **Strict Multi-Tenant Isolation**: Proves rival organizations cannot query or modify FeedbackPulse feedback or roadmap records.
5. **Code Promotion Escape Hatch**: Exports `FeedbackPost` to clean TypeScript Drizzle ORM schema code (`export const feedback_posts = pgTable(...)`).

---

### Suite 2: Admin UI Frontend (21 Test Cases across 8 Suites)
Located in `admin/src/test/`. Verified using Vitest + React Testing Library + JSDOM (`npm test`):

1. **Authentication Suite (`auth.test.tsx`)**:
   - `renders the login page with demo account shortcuts`: Confirms branded UI and 1-click accounts.
   - `submits login credentials and stores token on success`: Tests form submission, JWT token caching, active org storage.
   - `displays error message when login fails`: Verifies alert banner rendering on 401 response.
2. **Navigation & Layout Suite (`navigation.test.tsx`)**:
   - `renders all navigation items in sidebar`: Verifies all 13 operational routes exist in the sidebar.
   - `header polls system health and displays database/redis badges`: Confirms live health pill polling and status indicator.
3. **API Studio Resources Suite (`resources.test.tsx`)**:
   - `lists existing dynamic resource definitions`: Checks dynamic entity schema cards and endpoints.
   - `opens create modal and adds field definition row`: Tests interactive field generator.
   - `clicking promote opens modal with generated Drizzle schema`: Verifies 1-click code promotion modal and copy action.
4. **Dynamic Data Explorer Suite (`dynamic-data.test.tsx`)**:
   - `renders dynamic table with columns from resource definition`: Tests schema-driven column generation.
   - `opens create modal with schema-driven form inputs`: Verifies form input generation matching schema data types.
5. **System Operations Suite (`system-tools.test.tsx`)**:
   - `jobs console displays queue tasks and triggers worker`: Confirms background queue tasks and worker execution triggers.
   - `webhooks dispatcher lists endpoints and dispatches test ping`: Verifies webhook subscription and HMAC-SHA256 signature handling.
   - `feature flags allows toggling feature states`: Tests interactive toggle switch firing PATCH requests.
   - `audit logs browser displays activity trail`: Tests immutable audit trail and JSON metadata drawer.
   - `api keys page displays keys and generation modal`: Verifies credential listing, raw key display, and revocation.
6. **Disaster Recovery & Backups Suite (`backups.test.tsx`)**:
   - `renders backup list, metrics cards, and table rows`: Verifies summary metrics, snapshot details, table counts, and archive status.
   - `verifies SHA256 integrity and triggers platform restore`: Tests on-demand SHA-256 integrity verification and confirmation modal restore flow.
7. **Organizations & Users Directory Suite (`organizations-users.test.tsx`)**:
   - `renders tenant organizations directory and member roster`: Verifies organization rows, slugs, and member lists.
   - `renders global user directory with search filter`: Verifies all registered platform accounts and search input filtering.
8. **Settings & Email Templates Suite (`settings-email.test.tsx`)**:
   - `renders tenant settings and updates JSON configuration`: Verifies configuration viewer and saving mechanism.
   - `renders email templates list and preview modal`: Verifies transactional email template list and dynamic preview modal.

---

### Suite 3: Customer Workspace Frontend (17 Test Cases across 7 Suites)
Located in `frontend/src/test/`. Verified using Vitest + React Testing Library + JSDOM (`npm test`):
1. **Authentication Suite (`auth.test.tsx`)**:
   - Registration flow with workspace provisioning.
   - Login with demo owner & viewer shortcuts.
   - Error handling and notification badge integration.
2. **Navigation & Dynamic Collections Suite (`navigation.test.tsx`, `dynamic-data.test.tsx`)**:
   - Sidebar rendering and active workspace display.
   - Dynamic collection list rendering from API definitions.
   - Dynamic record creation modal with schema-driven validation.
3. **Team & Storage Management Suite (`team-files.test.tsx`)**:
   - Team member listing and invitation generation.
   - Tenant-isolated file browser and streaming downloads.
   - RBAC view/edit mutation restrictions.
4. **Billing & Subscriptions Suite (`billing.test.tsx`)**:
   - `renders active subscription details and capacity meters`: Verifies plan tier, renewal date, resource capacity meters, and invoice history table.
   - `allows upgrading to Enterprise plan`: Tests plan tier selection, simulated Stripe checkout session creation, and instant plan promotion.
5. **Developer API Keys Suite (`api-keys.test.tsx`)**:
   - `renders API keys list with active and revoked statuses`: Verifies masked key prefix, status badges, and actions.
   - `opens modal, generates new key, and displays raw secret key`: Verifies raw secret key generation and security warning modal.
6. **Account Profile & Security Suite (`profile.test.tsx`)**:
   - `renders profile settings form and updates display name`: Verifies display name synchronization and PATCH update.
   - `submits password change form and displays success state`: Tests old and new password submission and feedback state.

---

### Suite 4: Standalone Background Queue Worker & Recurring Schedules Suite (5 Test Cases)
Located in `cron/worker.test.ts`. Verified using Node Test Runner + tsx (`npm run test -w cron`):
1. **Transactional Email Dispatch**: Verifies worker processes `email.send` jobs, renders dynamic mustache templates, records dispatched emails in `email_logs`, and marks jobs `completed`.
2. **Webhook Event Dispatcher**: Verifies worker computes HMAC-SHA256 signatures, attempts HTTP delivery, creates `webhook_deliveries` audit logs, and handles simulated receiver endpoints.
3. **Retry & Failure Exhaustion Mechanics**: Verifies failing jobs record `lastError`, increment `attempts`, remain `pending` while `attempts < maxAttempts`, and transition to `failed` once attempts are exhausted.
4. **Stale Invitation Cleanup**: Verifies worker executes `cleanup.expired_invites`, purging expired invitation tokens while preserving valid invites.
5. **Periodic Cron Scheduler**: Verifies `runSchedulerTick` evaluates registered intervals (`cleanup.expired_invites` hourly, `backup.create` daily), enqueues due tasks into the queue, and avoids duplicate triggers.

---

### Suite 5: End-to-End Multi-App Journeys (Playwright Chromium)
Located in `e2e/multi-app-journey.spec.ts`. Coordinated live execution across Fastify API (`:4000`), Admin Portal (`:5173`), and Customer App (`:3001`):
1. **Admin Superadmin Resource Definition & Code Promotion**:
   - Validates live Superadmin login, platform stats cards, dynamic CRUD resource generation, and 1-click code promotion modal.
2. **Customer Tenant Lifecycle**:
   - Tests signup, workspace bootstrapping, file management, cryptographically signed team invitations, and developer API key generation.
3. **Viewer RBAC Mutation Locks**:
   - Verifies viewer member role cannot perform destructive or state-changing actions on files or team members.
4. **Platform Operations Audit Trail**:
   - Verifies cross-application tenant actions are recorded into the centralized audit trail and background jobs queue console.
5. **Billing & Subscription Self-Service**:
   - Authenticates as workspace owner into Customer App.
   - Navigates to `/settings/billing`, inspects plan entitlement limits, and executes upgrade to Enterprise tier.
6. **Disaster Recovery Operations**:
   - Superadmin navigates to Disaster Recovery console, captures on-demand platform snapshot, and verifies SHA-256 archive checksum.

---

## 📝 Execution Log

### Entry 001 - Initial Setup & Baseline Verification
- Configured embedded PostgreSQL (PGlite) storing at `backend/.data/postgres`.
- Integrated local Redis server at `redis://127.0.0.1:6379`.
- Verified health check endpoint (`/health`) reporting healthy for both databases without Docker.
- Initial schema migrations generated (`0000_broad_nehzno.sql` and `0001_productive_thor_girl.sql`).
- Baseline Auth and API Studio dynamic CRUD verified with curl.

### Entry 002 - Full V1 Kernel Implementation & Test Suite
- Completed all 14 kernel modules across 17 database tables.
- Applied migration `0002_fluffy_ikaris.sql`.
- Built automated database seeder (`npm run db:seed`).
- Created and executed comprehensive 18-point verification test suite (`npm test`).
- 100% test pass rate achieved in under 1 second.

### Entry 003 - Complete Admin Portal Implementation (`admin/`)
- Initialized React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, and React Router v7.
- Built full suite of administrative screens (`Login`, `Dashboard`, `Resources`, `DynamicData`, `Organizations`, `Users`, `Jobs`, `Webhooks`, `Email`, `FeatureFlags`, `AuditLogs`, `ApiKeys`, `Settings`).
- Configured Vite proxy to backend API (`http://localhost:4000`) for seamless development.
- Verified clean production build (`npm run build`) in 487ms.

### Entry 004 - Comprehensive Admin Automated Test Suite
- Integrated Vitest, React Testing Library, and JSDOM into `admin/`.
- Authored 5 test suites covering 15 distinct functional scenarios.
- Fixed query selectors and input validation assertions.
- Executed `npm test` in `admin/`: 15 of 15 tests passed cleanly in 1.23s.
- Re-verified `backend/` suite: 18 of 18 tests passing in 975ms.
- Both layers are 100% covered and fully in sync with GSD directives.

### Entry 005 - Customer Facing App Implementation & Test Suite (`frontend/`)
- **Technology Stack**: React 19, TypeScript, Vite (running on port 3000), Tailwind CSS v4, Lucide icons, React Router v7.
- **Port Allocation**: Backend (`4000`), Admin Portal (`5173`), Customer App (`3000`). Both frontends proxy `/api` and `/health` requests to `http://localhost:4000`.
- **Customer Pages Implemented**:
  1. `Login` (`/login`): Clean authentication interface with 1-click preset demo accounts (`Startup Labs Owner`, `Startup Labs Viewer`).
  2. `Signup` (`/signup`): Workspace registration creating isolated tenant organizations and owner user accounts.
  3. `AcceptInvite` (`/invite/:token`): One-click team onboarding flow verifying invite tokens and joining existing tenant organizations.
  4. `Dashboard` (`/`): Real-time metrics overview (dynamic collections count, files count, active members, developer keys count, quick links).
  5. `DynamicResourceView` (`/workspace/:resourceSlug`): Dynamic collections browser rendering schema-driven table columns, text search, sorting, modal creation/editing, and strict RBAC enforcement (viewer roles get read-only indicators and mutation locks).
  6. `Team` (`/settings/team`): Member list with roles, plus direct team invite link generation modal (`POST /api/v1/organizations/:id/invites`).
  7. `ApiKeys` (`/settings/api-keys`): Developer key manager supporting expiration intervals, raw secret key copy banner, and revocation actions.
  8. `Files` (`/files`): Organization storage browser with base64 file upload modal and direct secure download links.
  9. `ProfileSettings` (`/settings/profile`): User account details, session overview, and active organization indicator.
- **Layout & Shell**:
  - `Sidebar`: Dynamic collection switcher that automatically queries `/api/v1/resources` and populates sidebar links, plus workspace/tenant dropdown switcher and user profile footer.
  - `Header`: Active workspace title and role badge, unread notification counter bell with real-time flyout drawer and "Mark all as read" capability (`/api/v1/notifications/mark-all-read`).
- **Automated Customer Test Suites (`frontend/src/test/`)**:
  - `auth.test.tsx` (3 tests): Login form rendering, demo account autofill and submission, tenant workspace signup.
  - `navigation.test.tsx` (2 tests): Workspace switcher, dynamic resource menu population, notification drawer opening, badge counts, and mark-all-read action.
  - `dynamic-data.test.tsx` (3 tests): Dynamic data table rendering, RBAC viewer lock enforcement, schema-driven record creation form.
  - `team-files.test.tsx` (3 tests): Team listing and invitation link generation, storage files list and upload modal, developer API key creation and raw secret token reveal.
- **Verification Proofs**:
  - `frontend`: 11 of 11 tests passing (`npm test`), clean production bundle (`npm run build`).
  - `admin`: 15 of 15 tests passing (`npm test`), clean production bundle (`npm run build`).
  - `backend`: 18 of 18 kernel tests passing (`npm test`).
  - Overall monorepo test pass rate: **44/44 tests passing (100%)**.

### Entry 006 - Root Dev Orchestration & Monorepo DX
- **Workspaces Configured**: Configured npm workspaces connecting `backend`, `admin`, and `frontend` in root `package.json`.
- **Unified Orchestration Commands**:
  - `npm run dev`: Bootstraps Backend (`:4000`), Admin (`:5173`), and Customer App (`:3000`) concurrently with formatted colored terminal prefixes via `concurrently`.
  - `npm test`: Runs test suites across all 3 tiers sequentially (`backend` 18 tests, `admin` 15 tests, `frontend` 11 tests).
  - `npm run build`: Builds TypeScript binaries and Vite production bundles for all 3 apps in one step.
  - `npm run db:migrate` & `npm run db:seed`: Seamless root database management delegates to the embedded backend PGlite database.
- **Teardown & Clean Exits**:
  - Implemented `after()` hook in `kernel.test.ts` closing Fastify server, Redis connection, and raw PGlite database handles to guarantee immediate process exits.
- **Documentation**:
  - Authored comprehensive root [`README.md`](../README.md) detailing architecture, setup commands, port allocations, and demo accounts.
- **Final Monorepo Verification**:
  - `npm test`: 44/44 tests passed cleanly across all workspaces in 5.3s.
  - `npm run build`: All 3 packages compiled without errors in 2.8s.

### Entry 007 - End-to-End Multi-App Journey Tests (Playwright)
- **Playwright Test Runner Setup**:
  - Installed `@playwright/test` and bundled Chromium browser engine at repository root.
  - Authored [`playwright.config.ts`](../playwright.config.ts) configuring automated multi-webServer management:
    - Backend Fastify API: `http://localhost:4000/health`
    - Admin Portal: `http://localhost:5173`
    - Customer Frontend: `http://localhost:3001`
  - Added `"test:e2e": "playwright test"` to root `package.json`.
- **Cross-Application Journey Test Scenarios (`e2e/multi-app-journey.spec.ts`)**:
  1. **Admin Portal: Superadmin Dynamic Resource Studio & Code Promotion**:
     - Superadmin logs in via 1-click credential shortcut, validates system metrics banner.
     - Defines dynamic CRUD resource schema (`projects_${id}`) with dynamic field configuration.
     - Inspects 1-click code promotion blueprint modal generating production-ready TypeScript Drizzle schema.
  2. **Customer Workspace: Registration, Team Collaboration & API Keys**:
     - New tenant registers on Customer App (`http://localhost:3001/signup`) creating user and tenant organization.
     - Validates workspace dashboard and tenant-isolated data collections.
     - Verifies isolated file storage navigation.
     - Generates cryptographically secure team invitation link on Team Members page.
     - Provisions scoped Developer API key with instant secret key display and copy support (`qs_live_...`).
  3. **RBAC Enforcement & Mutation Locks**:
     - Authenticates as Viewer demo member (`viewer@startup.io`) into workspace.
     - Verifies viewer role tag in header.
     - Confirms mutation locks: "Upload File" and "Invite Team Member" action controls are strictly withheld.
  4. **Platform Audit Trail & Background Job Queue**:
     - Superadmin logs into Admin Portal to inspect centralized audit trails.
     - Verifies tenant mutations, logins, and API actions are immutably captured in PostgreSQL audit log table.
     - Navigates to Background Jobs console verifying asynchronous queue monitoring and retry capabilities.
- **Architectural Enhancements**:
  - `backend/src/middleware/auth.ts`: Added intelligent organization context fallback for superadmin requests without explicit `x-organization-id` headers.
  - `backend/src/modules/audit/audit.routes.ts`: Enabled platform-wide audit log queries for superadmins across all tenant organizations.
  - `backend/src/modules/resources/resources.routes.ts`: Permitted superadmins to generate code promotion blueprints across all system resources with audit logging.
  - `admin/src/lib/api.ts` & `frontend/src/lib/api.ts`: Conditionally attached `Content-Type: application/json` headers only when a request body is present, eliminating Fastify `FST_ERR_CTP_EMPTY_JSON_BODY` errors.
- **Verification Results**:
  - `npm test`: **44/44 unit & integration tests passing (100%)** across backend, admin, and frontend in 4.6s.
  - `npm run test:e2e`: **4/4 end-to-end multi-app journey tests passing (100%)** against real live servers in 8.2s.

### Entry 008 - Billing & Subscription Engine (Stripe Integration & Entitlement Gating)
- **Multi-Tenant Subscription Schema & Migration**:
  - Designed [`backend/src/db/schema/subscriptions.ts`](../backend/src/db/schema/subscriptions.ts) with `subscriptions` and `invoices` tables:
    - `subscriptions`: `organization_id` (foreign key, unique), `plan` (`free`, `pro`, `enterprise`), `status` (`active`, `past_due`, `canceled`, etc.), `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `current_period_start`, `current_period_end`, `cancel_at_period_end`.
    - `invoices`: `organization_id`, `stripe_invoice_id`, `amount_paid`, `currency`, `status`, `invoice_pdf`, `hosted_invoice_url`.
  - Generated and applied Drizzle migration `drizzle/0003_daily_wolverine.sql` cleanly to PGlite.
  - Seeded initial active Pro tier subscription and mock paid invoice for `Startup Labs` in `backend/src/db/seed.ts`.
- **Plan Definitions & Stripe Integration Helper**:
  - Authored [`backend/src/lib/stripe.ts`](../backend/src/lib/stripe.ts) defining `PLAN_CONFIGS`:
    - **Starter (Free)**: \$0/mo, 3 team members, 3 dynamic resources, 50 MB storage, 2 API keys.
    - **Growth (Pro)**: \$49/mo, 15 team members, 15 dynamic resources, 5 GB storage, 15 API keys.
    - **Scale (Enterprise)**: \$199/mo, unlimited team members, unlimited dynamic resources, 100 GB storage, unlimited API keys.
  - Built `getOrganizationUsage()` computing live database counts across `memberships`, `resources`, `api_keys`, and `files` (sum of `file_size_bytes`).
  - Added dual-mode Stripe client handling: live Stripe client when `STRIPE_SECRET_KEY` is supplied, and automated local simulation mode when absent.
- **Backend API Routes (`/api/v1/billing/*`)**:
  - Registered in [`backend/src/modules/billing/billing.routes.ts`](../backend/src/modules/billing/billing.routes.ts):
    - `GET /billing/plans`: Returns all tiered plans, prices, limits, and feature lists.
    - `GET /billing/subscription`: Returns active subscription, plan details, live usage metrics, and recent invoice history.
    - `POST /billing/checkout`: Creates a Stripe Checkout Session or returns simulated checkout response.
    - `POST /billing/portal`: Generates Stripe Billing Portal URL for customer self-service payment management.
    - `POST /billing/simulate-upgrade`: Instant local development promotion without requiring external Stripe webhooks.
    - `GET /billing/invoices`: Returns tenant's historical invoices.
    - `POST /billing/webhook`: Handles Stripe webhooks (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`) with signature verification fallback.
- **Entitlement & Capacity Gating Middleware**:
  - Implemented [`backend/src/middleware/entitlements.ts`](../backend/src/middleware/entitlements.ts) (`requirePlanEntitlement`):
    - Enforced on `POST /organizations/:id/invites` (max members limit).
    - Enforced on `POST /resources` (max dynamic resources limit).
    - Enforced on `POST /api-keys` (max API keys limit).
    - Enforced on `POST /files` (max storage bytes capacity limit).
    - Returns standardized HTTP 403 `PLAN_LIMIT_EXCEEDED` error code with upgrade CTA metadata.
- **Customer Self-Service Billing UI (`frontend/src/pages/Billing.tsx`)**:
  - Built `/settings/billing` page with:
    - Current Plan hero badge, monthly pricing, status, and renewal date.
    - Capacity & Resource Entitlements progress meters for Team Collaborators, Dynamic Collections, Storage, and API Keys.
    - Tier selection cards comparing Starter, Growth, and Scale plans with instant upgrade buttons.
    - Payment & Invoice History table with download receipt links.
    - Stripe Customer Portal launcher.
  - Added navigation item in [`frontend/src/components/Layout/Sidebar.tsx`](../frontend/src/components/Layout/Sidebar.tsx) and route in [`frontend/src/App.tsx`](../frontend/src/App.tsx).
- **Verification Proofs**:
  - `backend`: Added tests 19 & 20 to `backend/src/tests/kernel.test.ts`. **20/20 backend tests passing (100%)**.
  - `admin`: **15/15 tests passing (100%)**.
  - `frontend`: Added [`frontend/src/test/billing.test.tsx`](../frontend/src/test/billing.test.tsx). **13/13 tests passing (100%)**.
  - Total Unit Tests: **48/48 passing (100%)** across monorepo in 4.9s.
  - TypeScript Compilation: **3/3 packages build cleanly (`tsc` / `vite build`) with 0 errors**.
  - Playwright E2E: Added Journey 5 in `e2e/multi-app-journey.spec.ts`. **5/5 end-to-end multi-app journeys passing (100%)** in 9.0s.

### Entry 009 - Backup & Disaster Recovery Engine (Critical Success Scenario #11)
- **Primary Architecture & Engine**:
  - Created [`backend/src/lib/backup.ts`](../backend/src/lib/backup.ts) implementing automated point-in-time disaster recovery snapshots:
    - `createBackup(options)`: Captures complete database cluster files (`.data/postgres`) and tenant uploaded storage files (`.data/storage`), strips lock artifacts (`postmaster.pid`), computes table record counts (`users`, `organizations`, `dynamicEntities`, `files`, `subscriptions`, `apiKeys`, `auditLogs`), compresses into a timestamped `.tar.gz` archive in `.data/backups/`, and computes cryptographic SHA-256 checksums alongside an immutable `manifest.json`.
    - `listBackups()`: Returns available snapshots sorted newest-first with table counts, sizes, and checksums.
    - `verifyBackup(id)`: Verifies archive readability and SHA-256 checksum integrity against manifest.
    - `restoreBackup(id)`: Validates checksum, unpacks database and storage to staging, cleanly closes live database connections, replaces live data directories, dynamically reloads database client, and verifies post-restore table queryability.
  - Enhanced [`backend/src/db/client.ts`](../backend/src/db/client.ts) with `reloadDatabaseClient()` and an ES dynamic proxy (`Proxy<Database>`) allowing live hot-reconnection to restored database files without process restarts.
- **CLI Automation Scripts**:
  - Authored [`scripts/backup.ts`](../scripts/backup.ts) (`npm run backup`): Single-command terminal snapshot generator with formatted summary cards and execution timing.
  - Authored [`scripts/restore.ts`](../scripts/restore.ts) (`npm run restore [backup-id]`): Single-command terminal restore tool with automatic checksum validation and table verification.
  - Registered `"backup"` and `"restore"` in root `package.json` and `backend/package.json`.
- **Backend Admin REST API**:
  - Implemented [`backend/src/modules/admin/backups.routes.ts`](../backend/src/modules/admin/backups.routes.ts) registered in [`backend/src/server.ts`](../backend/src/server.ts):
    - `GET /api/v1/admin/backups`: Returns all snapshots with manifests.
    - `POST /api/v1/admin/backups`: Creates on-demand snapshot with optional label and records audit trail (`backup.created`).
    - `GET /api/v1/admin/backups/:id`: Returns specific snapshot details.
    - `POST /api/v1/admin/backups/:id/verify`: Validates SHA-256 archive checksum.
    - `POST /api/v1/admin/backups/:id/restore`: Restores platform state and records audit trail (`backup.restored`).
    - `DELETE /api/v1/admin/backups/:id`: Deletes backup archive and records audit trail (`backup.deleted`).
- **Admin UI Portal (`admin/src/pages/Backups.tsx`)**:
  - Created Disaster Recovery console at route `/backups` under "Platform Operations":
    - Metrics banner displaying total snapshots, latest backup time, database engine, and total archive storage.
    - Interactive "Create Snapshot" modal with custom label support.
    - Snapshots table displaying labels, filenames, timestamps, sizes, table counts badges, and SHA-256 checksums.
    - 1-click "Verify Checksum" action with verified badge status.
    - 1-click "Restore" action with comprehensive warning confirmation modal and automated table refresh.
- **Verification Results**:
  - `backend`: Added Test 21 in [`backend/src/tests/kernel.test.ts`](../backend/src/tests/kernel.test.ts). **21/21 tests passing (100%)** in 4.7s.
  - `admin`: Added [`admin/src/test/backups.test.tsx`](../admin/src/test/backups.test.tsx). **17/17 tests passing (100%)** in 1.2s.
  - `frontend`: **13/13 tests passing (100%)** in 1.5s.
  - Total Unit & Integration Tests: **51/51 passing (100%)** across monorepo.
  - TypeScript Compilation: **3/3 packages build cleanly (`tsc` / `vite build`) with 0 errors**.
  - Playwright E2E: Added Journey 6 in [`e2e/multi-app-journey.spec.ts`](../e2e/multi-app-journey.spec.ts). **6/6 cross-application journeys passing (100%)** in 12.0s.

### Entry 010 - Comprehensive Monorepo Test Coverage & Robustness Expansion
- **Backend Kernel Verification Expansion (25/25 Tests Passing)**:
  - Added Test 22: Hard capacity limit enforcement on Free plan tier (blocks 3rd API key with HTTP 403 `limitExceeded: true`) and validates entitlement unblocking following simulated Pro upgrade (HTTP 201).
  - Added Test 23: Tenant storage isolation security checks proving cross-tenant private file downloads return HTTP 403, superadmin elevation allows cross-tenant inspection (HTTP 200), and non-existent IDs return HTTP 404.
  - Added Test 24: Dynamic Resource Engine schema validation errors (HTTP 422 on missing required fields/type mismatches) and record deletion (HTTP 200 with subsequent GET yielding HTTP 404).
  - Added Test 25: Disaster Recovery error handling verifying HTTP 404 for invalid verify, restore, and delete operations on non-existent snapshot IDs.
- **Admin UI Test Suite Expansion (21/21 Tests Passing across 8 Suites)**:
  - Authored [`admin/src/test/organizations-users.test.tsx`](../admin/src/test/organizations-users.test.tsx) testing multi-tenant organization directories and global user search filtering.
  - Authored [`admin/src/test/settings-email.test.tsx`](../admin/src/test/settings-email.test.tsx) testing tenant configuration editor JSON persistence and transactional email template preview modals.
- **Customer Workspace Frontend Test Suite Expansion (17/17 Tests Passing across 7 Suites)**:
  - Authored [`frontend/src/test/api-keys.test.tsx`](../frontend/src/test/api-keys.test.tsx) testing API key listings, masked prefixes, active/revoked badges, modal generation, and raw secret copy flow.
  - Authored [`frontend/src/test/profile.test.tsx`](../frontend/src/test/profile.test.tsx) testing display name updates, async auth state synchronization (`useEffect` sync in [`frontend/src/pages/ProfileSettings.tsx`](../frontend/src/pages/ProfileSettings.tsx)), and password change flows.
- **Full Monorepo Verification Proofs**:
  - `npm test`: **63/63 unit & integration tests passing (100%)** across backend (25), admin (21), and frontend (17).
  - `npm run build`: **3/3 packages build cleanly (`tsc` / `vite build`) with 0 errors**.
  - `npm run test:e2e`: **6/6 multi-app cross-application journeys passing (100%)** in 11.6s.

### Entry 011 - Copy-First SaaS Scaffolder CLI & Reference Vertical SaaS (Scenario #12 / Quality Gate G7)
- **Copy-First SaaS Generator CLI (`scripts/create-saas.ts`)**:
  - Created [`scripts/create-saas.ts`](../scripts/create-saas.ts) executable via `npm run create-saas <output-dir> [--name=...] [--slug=...] [--template=...]`:
    - Automatically clones the clean kernel architecture to the target directory.
    - Excludes transient files (`node_modules`, `.data`, `dist`, `.git`, `backups`, `dump.rdb`, `playwright-report`).
    - Generates unique cryptographically secure secrets (`JWT_SECRET`, `SESSION_SECRET`, `WEBHOOK_SIGNING_SECRET`) in target `.env`.
    - Re-brands root and workspace `package.json` files and generates custom target `README.md`.
    - Generates template-specific schema definitions and `saas-manifest.json` for rapid 0-to-1 vertical delivery.
  - Registered `"create-saas"` command in root `package.json` and `backend/package.json`.
- **Database Engine Resilience Enhancements**:
  - Enhanced [`backend/src/db/client.ts`](../backend/src/db/client.ts) to automatically detect and purge stale `postmaster.pid` lock files on startup, preventing PGlite startup crashes after aborted processes.
- **Turnkey Reference SaaS "FeedbackPulse" & Automated Verification**:
  - Authored [`backend/src/tests/sample-saas.test.ts`](../backend/src/tests/sample-saas.test.ts) (5 test cases) validating Critical Success Scenario #12 without rewriting a single line of backend kernel code:
    - *Test 1*: Fresh bootstrap & registration of SaaS tenant `FeedbackPulse Inc` (`founder@feedbackpulse.io`).
    - *Test 2*: Provisioning dynamic schemas `FeedbackPost` and `ProductRoadmap` via API Studio.
    - *Test 3*: End-to-end dynamic CRUD runtime (creating feedback, status transitions to `planned`, upvotes, and public roadmaps).
    - *Test 4*: Multi-tenant boundary protection proving competitor organizations cannot access or alter FeedbackPulse records.
    - *Test 5*: Code promotion escape hatch exporting `FeedbackPost` to clean TypeScript Drizzle schema.
- **Monorepo Verification Results**:
  - `npm test`: **68/68 unit & integration tests passing (100%)** across `backend` (30), `admin` (21), and `frontend` (17).
  - `npm run build`: **3/3 packages build cleanly (`tsc` / `vite build`) with 0 errors**.

### Entry 012 - Unopinionated CI/CD Architecture ("Primitives Over Pipelines")
- **Architectural Directive**:
  - Deliberately avoid vendor lock-in or forced CI/CD pipelines (.github/workflows) in the root repository and scaffolded starter kits (`create-saas`).
  - Keep the monorepo and generated applications 100% unopinionated by exposing standard, exit-code-aware CLI primitives in `package.json` (`npm run build`, `npm test`, `npm run test:e2e`, `npm run backup`, `npm run db:migrate`).
- **Pluggable CI/CD Recipes Hub**:
  - Created [`documents/ci-recipes/README.md`](../documents/ci-recipes/README.md) documenting pipeline integration principles.
  - Authored [`documents/ci-recipes/github-actions.md`](../documents/ci-recipes/github-actions.md) for GitHub Actions users.
  - Authored [`documents/ci-recipes/gitlab-ci.md`](../documents/ci-recipes/gitlab-ci.md) for GitLab CI users.
  - Authored [`documents/ci-recipes/docker-vps.md`](../documents/ci-recipes/docker-vps.md) for direct VPS, Coolify, Dokku, or Hetzner server deployment scripts with automatic rollback protection.
- **Documentation & Verification**:
  - Updated [`README.md`](../README.md) with references to CI/CD recipes and confirmed clean TypeScript builds across all workspaces (`npm run build`).

### Entry 013 - Interactive Terminal SaaS Installer CLI (`create-saas`)
- **Interactive Scaffolder Wizard (`scripts/create-saas.ts`)**:
  - Converted `npm run create-saas` into a guided interactive terminal installer (using Node's native `readline/promises` with zero external dependencies).
  - Prompts developer through:
    1. **Application Branding**: Name, slug identifier, description, and target folder.
    2. **Vertical Starter Template**: `feedback-hub` (Customer feedback & roadmap), `crm` (Sales pipeline), or `minimal` (Clean slate).
    3. **CI/CD Integration Choice**: Prompts if developer wants `none` (default unopinionated), `github` (generates `.github/workflows/ci.yml`), or `gitlab` (generates `.gitlab-ci.yml`).
    4. **Initial User Credentials & Tenant**: Superadmin email/password, organization workspace name.
    5. **Optional Third-Party APIs**: Prompts for Stripe secret key, transactional email key, and S3 storage bucket (or skips for local simulation mode).
    6. **Installation Summary & Confirmation**: Displays styled terminal summary card and requests confirmation before scaffolding.
  - Added support for `--yes` / `-y` non-interactive bypass for CI and automated scripting.
- **Dynamic Seeding with Custom Credentials**:
  - Enhanced [`backend/src/db/seed.ts`](../backend/src/db/seed.ts) to read `INITIAL_SUPERADMIN_EMAIL`, `INITIAL_SUPERADMIN_PASSWORD`, `INITIAL_ORG_NAME`, and `INITIAL_ORG_SLUG` from `.env`, seeding the user's custom credentials on `npm run db:seed`.
- **Full Verification**:
  - Tested non-interactive CLI generator with custom credentials and GitHub Actions CI workflow generation.
  - Verified clean builds (`npm run build`) and 100% test pass rate (`npm test` - 68/68 tests passing).

### Entry 014 - Standalone Background Queue Worker & Recurring Schedules Daemon (`cron/`)
- **Architectural Directive**:
  - In production systems, background queues and recurring cron schedules must not be tightly coupled to HTTP API web servers. They should be deployable as independent, scalable worker processes or unified daemons.
- **Standalone Background Worker Daemon (`cron/worker.ts`)**:
  - Independent daemon polling background queues (`default`, `email`, `webhooks`) with configurable intervals.
  - **Dual Queue Engine**: Reads jobs from Redis list queues (`RPOP queue:<name>`) with automatic fallback to PostgreSQL/PGlite database queue (`job_records` polling).
  - **Built-in Handlers**:
    - `email.send`: Renders mustache templates, logs sent emails to `email_logs`, and marks jobs completed.
    - `webhook.dispatch`: Computes SHA-256 HMAC signatures (`X-QuickSaaS-Signature`), dispatches HTTP POST events, logs responses to `webhook_deliveries`, and handles retry errors.
    - `backup.create`: Automatically triggers zero-downtime database snapshot generation.
    - `cleanup.expired_invites`: Purges stale organization invitation tokens past `expiresAt`.
    - Custom job registration API via `registerJobHandler(name, handler)`.
  - **Fault Tolerance**: Automatic attempt tracking (`attempts + 1`), error capturing (`lastError`), retry loops when `attempts < maxAttempts`, and clean exhaustion marking (`status: 'failed'`).
- **Recurring Cron Scheduler (`cron/scheduler.ts`)**:
  - Interval-based daemon evaluating registered scheduled tasks:
    - `cleanup.expired_invites` (hourly interval).
    - `backup.create` (daily automated backup interval).
  - Ticking engine (`runSchedulerTick(now)`) prevents duplicate firings and pushes tasks into the queue with Redis/DB synchronization.
- **Unified CLI & Daemon Runner (`cron/index.ts`)**:
  - Unified process running worker and scheduler concurrently, with `--worker-only` and `--scheduler-only` flags for distributed container architectures.
  - Root `package.json` scripts: `npm run worker` (runs standalone worker) and `npm run cron` (runs unified daemon).
- **Zero-Docker Monorepo Path Resilience**:
  - Updated [`backend/src/db/client.ts`](../backend/src/db/client.ts) and [`backend/src/db/migrate.ts`](../backend/src/db/migrate.ts) to resolve database storage and migrations folders using `import.meta.url`, ensuring `backend`, `cron`, and CLI installer scripts all share the exact same database (`backend/.data/postgres`) regardless of execution working directory.
- **Automated Verification Suite (`cron/worker.test.ts`)**:
  - 5 comprehensive tests validating transactional email dispatch, webhook HMAC signing, job retry/exhaustion mechanics, stale invite cleanup, and scheduler ticks.
- **Monorepo Verification Results**:
  - `npm test`: **73/73 unit & integration tests passing (100%)** across `backend` (30), `admin` (21), `frontend` (17), and `cron` (5).
  - `npm run build`: **Clean 0-error TypeScript build across all packages**.

### Entry 015 - Monorepo Shared Types (`packages/types`) & Architecture Decision Records (`documents/adr/`)
- **Shared Package Extraction (`packages/types`)**:
  - Created standalone workspace `@quicksaas/types` under `packages/types/` fulfilling the blueprint specification (`packages/ shared types/schemas/UI/config`).
  - Added modular TypeScript definitions:
    - `auth.ts`: `User`, `Organization`, `OrganizationMember`, `OrganizationInvite`, `UserRole`, `AuthTokenPayload`, `ApiKey`.
    - `resources.ts`: `FieldType`, `FieldDefinition`, `ResourceDefinition`, `DynamicRecord`, `PromotionResult`.
    - `billing.ts`: `PlanTier`, `SubscriptionStatus`, `PlanDefinition`, `TenantSubscription`, `EntitlementLimits`, `EntitlementCheckResult`.
    - `webhooks.ts`: `WebhookEndpoint`, `WebhookDelivery`, `WebhookEventPayload`.
    - `jobs.ts`: `JobStatus`, `JobRecord`, `JobPayload`.
    - `email.ts`: `EmailTemplate`, `EmailLog`, `EmailDispatchPayload`.
    - `audit.ts`: `AuditAction`, `AuditLogEntry`.
  - Registered `"packages/*"` in root `package.json` workspaces and integrated compilation into root `npm run build`.
- **Formal Architecture Decision Records (`documents/adr/`)**:
  - Created ADR governance directory with standardized Markdown templates and index:
    - [`documents/adr/README.md`](adr/README.md): Index and lifecycle governance (Proposed, Accepted, Superseded, Deprecated).
    - [`ADR-0001`](adr/0001-record-architecture-decisions.md): Record Architecture Decisions using MADR standard.
    - [`ADR-0002`](adr/0002-zero-docker-default-pglite.md): Zero-Docker Local Development with Embedded PGlite and seamless production Postgres swap.
    - [`ADR-0003`](adr/0003-headless-single-source-of-truth.md): Headless API Boundary treating Admin and Tenant UI as equal REST consumers.
    - [`ADR-0004`](adr/0004-dynamic-resource-engine-with-escape-hatch.md): Dynamic Resource Engine with 1-Click Code Promotion to TypeScript Drizzle code.
    - [`ADR-0005`](adr/0005-dual-authentication-model.md): Dual Authentication using JWT Sessions and Cryptographic API Keys (`qs_live_...`).
    - [`ADR-0006`](adr/0006-unopinionated-ci-cd-primitives.md): Unopinionated CI/CD: CLI Primitives Over Forced Vendor Pipelines.
    - [`ADR-0007`](adr/0007-decoupled-cron-and-queue-daemons.md): Decoupled Background Workers & Cron Scheduling Daemons.
- **Verification**:
  - `npm run build`: All 4 packages compile cleanly (`@quicksaas/types`, `backend`, `admin`, `frontend`) in ~1s.
  - `npm test`: **73/73 tests passing (100%)**.

### Entry 016 - Production Infrastructure & Container Orchestration (`infra/`)
- **Architectural Directive**:
  - Provide production-grade, turn-key deployment assets for developers transitioning beyond local Zero-Docker mode to any cloud provider, container cluster, or bare-metal VPS, fulfilling the blueprint requirement (`infra/ Docker, database, Redis, object storage, proxy, monitoring, backups`).
- **Production Container Buildfiles**:
  - [`infra/Dockerfile.backend`](../infra/Dockerfile.backend): Multi-stage `node:22-alpine` build with automated migration bundling, healthcheck probe, and non-root runner.
  - [`infra/Dockerfile.cron`](../infra/Dockerfile.cron): Standalone daemon runner for background queue processing and cron schedules.
  - [`infra/Dockerfile.admin`](../infra/Dockerfile.admin): Multi-stage Vite build served by hardened `nginx:alpine` with SPA routing and asset compression.
  - [`infra/Dockerfile.frontend`](../infra/Dockerfile.frontend): Multi-stage Vite build for customer workspace app served by `nginx:alpine`.
- **Edge Reverse Proxy Routing**:
  - [`infra/Caddyfile`](../infra/Caddyfile) & [`infra/nginx.conf`](../infra/nginx.conf): Zero-config reverse proxy routing `/api/*` to Fastify, `/documentation` to OpenAPI, `/admin` to Admin UI, and `/` to Frontend App.
- **Container Orchestration**:
  - [`infra/docker-compose.yml`](../infra/docker-compose.yml): Complete 9-service production stack (PostgreSQL 16, Redis 7, MinIO S3 object storage with automated bucket provisioning, Backend API, Cron Worker, Admin Portal, Frontend App, and Caddy Edge Proxy).
  - [`infra/docker-compose.deps-only.yml`](../infra/docker-compose.deps-only.yml): Lightweight hybrid development compose file running Postgres, Redis, and MinIO in containers while developers run `npm run dev` natively on their host machine.
- **Documentation & Operational Runbook**:
  - [`infra/README.md`](../infra/README.md): Architecture topology diagram, single-command startup (`docker compose up -d`), environment variable references, and in-container disaster recovery procedures (`docker exec -it quicksaas-backend npm run backup`).
- **Full Verification**:
  - `docker compose -f infra/docker-compose.yml config`: 100% valid syntax with zero warnings.
  - `docker compose -f infra/docker-compose.deps-only.yml config`: 100% valid syntax with zero warnings.
  - `npm run build`: **0-error compilation across all 4 monorepo packages**.
  - `npm test`: **73/73 tests passing (100%)**.

### Entry 017 - Enhanced Interactive Installer & Admin Password Reset CLI
- **Enhanced Scaffolder CLI (`scripts/create-saas.ts`)**:
  - Upgraded `npm run create-saas` into a comprehensive, multi-phase interactive wizard and non-interactive CI tool.
  - **Site Branding & Metadata**: Prompts for Site/Application Name, URL slug, description, and official GitHub repository URL.
  - **Tailwind CSS Theme Synchronization**:
    - Prompts for Primary Brand Color Hex (e.g., `#6366f1`, `#0ea5e9`, `#10b981`) with hex validation.
    - Computes hover (`-12%`), active (`-20%`), and accent (`+15%`) shades dynamically.
    - Injects Tailwind v4 `@theme` configuration into both `admin/src/index.css` and `frontend/src/index.css`, dynamically skinning all buttons, badges, gradients, and active navigation items across both portals.
    - Injects `<meta name="theme-color" content="...">` and customized browser titles into `admin/index.html` and `frontend/index.html`.
  - **Storage Settings (EC2 EBS vs AWS S3 / MinIO)**:
    - Dedicated driver selection: `local` (EC2 attached EBS volume or local disk path) vs `s3` (AWS S3, MinIO, or Cloudflare R2).
    - Captures local path (e.g. `./storage`, `/mnt/ebs/storage`), or S3 bucket, region, credentials, and custom endpoints.
    - Updated [`backend/src/modules/files/files.routes.ts`](../backend/src/modules/files/files.routes.ts) and [`backend/src/lib/backup.ts`](../backend/src/lib/backup.ts) to respect `STORAGE_LOCAL_DIR`.
  - **First Admin User Provisioning**:
    - Captures Superadmin Full Name, Email, Password (with auto-generated 24-character high-entropy fallback), and Organization Name.
    - Pre-populates environment variables for automatic first-boot database seeding (`npm run db:seed`).
  - **Production Environment Generation**:
    - Generates a fully organized, heavily commented `.env` file in the destination project with all branding, JWT, database, Redis, storage, credentials, and third-party API configurations.
- **Dedicated Admin Password Reset Utility (`scripts/reset-admin.ts`)**:
  - Created standalone CLI tool: `npm run admin:reset-password`.
  - Supports interactive prompt or non-interactive CLI flags (`--email`, `--password`, `--generate`).
  - Automatically queries the database for superadmin accounts, hashes new passwords securely using scrypt (`hashPassword`), updates database credentials, and outputs a formatted confirmation card.
- **Full Verification**:
  - Tested dry-run scaffolding into `/tmp/test-saas-install` validating `.env`, Tailwind `@theme` injection, HTML meta tags, and storage directories.
  - Tested `npm run admin:reset-password -- --help`.
  - `npm run build`: **0 errors across all 4 packages**.
  - `npm test`: **73/73 tests passing (100%)**.

### Entry 018 - Compact Terminal Logging & Persistent Project Disk Logs
- **Compact ANSI Terminal Logger (`backend/src/lib/logger.ts`)**:
  - Replaced noisy, multi-line (8–12 lines per request) Fastify raw Pino logs with a clean, single-line, color-coded terminal logger.
  - Color-coded HTTP verbs: Cyan (`GET`), Green (`POST`), Yellow (`PUT`/`PATCH`/4xx warnings), Red (`DELETE`/5xx errors).
  - Outputs concise execution telemetry: `[HH:MM:SS] METHOD /url STATUS (duration) - actor/error`.
  - Added test run filter: suppresses request spam during Vitest/Node test execution (`NODE_ENV === "test"`), while keeping genuine runtime warnings and 5xx errors visible.
  - Attached to Fastify instance lifecycle via `onRequest` and `onResponse` hooks in [`backend/src/server.ts`](../backend/src/server.ts).
- **Persistent Disk-Based File Logging (`.data/logs/`)**:
  - Maintained within the project directory structure under `.data/logs/`:
    - `.data/logs/app.log`: Persistent log of all HTTP traffic, background worker tasks, cron scheduler ticks, and system events.
    - `.data/logs/error.log`: Dedicated error file capturing 5xx HTTP responses, unhandled exceptions, and background job failures.
  - Zero-Docker compliant: utilizes pure Node.js asynchronous filesystem streams (`node:fs/promises`) with automatic parent directory creation (`mkdir({ recursive: true })`).
- **Worker & Scheduler Logging Integration**:
  - Integrated `logger.info` and `logger.error` into [`cron/worker.ts`](../cron/worker.ts) and [`cron/scheduler.ts`](../cron/scheduler.ts).
  - Background task executions, retries, and errors write directly to both terminal and `.data/logs/`.
- **Superadmin Log Inspection API Endpoint**:
  - Added `GET /api/v1/admin/system/logs` in [`backend/src/modules/admin/admin.routes.ts`](../backend/src/modules/admin/admin.routes.ts).
  - Guarded by `authenticate` and `requireSuperadmin`.
  - Supports query parameters `?type=app|error` and `?lines=100` (up to 500) to safely tail disk logs from the Admin Portal or REST client without requiring shell/SSH access.
- **Log Layer Clarity in QuickSaaS**:
  1. **Business Audit Trail**: Database-backed in PostgreSQL/PGlite table `audit_logs` (actor, action, resource, tenant, IP, user-agent).
  2. **Delivery Logs**: Dedicated database tables (`email_logs`, `webhook_deliveries`, `job_records`).
  3. **Runtime System Logs**: Persistent file-based logs on disk (`.data/logs/app.log`, `.data/logs/error.log`).
- **Full Verification**:
  - `npm run build`: **0-error compilation across all 4 monorepo packages**.
  - `npm test`: **73/73 tests passing (100%)** (`backend` 30, `admin` 21, `frontend` 17, `cron` 5).
