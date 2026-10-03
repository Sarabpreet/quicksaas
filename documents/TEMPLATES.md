# QuickSaaS - Templates & Vertical SaaS Guide

QuickSaaS is built around a **Copy-First Architecture** (Quality Gate G7 / Critical Scenario #12). It allows you to transform the headless SaaS kernel into an operational, vertical SaaS application in seconds.

---

## 🧭 The Architecture: Kernel vs. Template

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      UNIVERSAL KERNEL (Unchanged)                      │
│  Auth • Tenancy • RBAC • Stripe Billing • Files • Webhooks • Audits   │
│  Point-in-Time Backups • Dynamic Resource Engine • Admin Portal        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
              Configured & Specialized by a "Template"
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     template: feedback-hub    │   │         template: crm         │
│  (Like Canny / UserVoice)     │   │  (Like HubSpot / Pipedrive)   │
│                               │   │                               │
│ • FeedbackPost Schema         │   │ • CustomerDeal Schema         │
│ • ProductRoadmap Schema       │   │ • SalesStage Schema           │
│ • "Status Updated" Email      │   │ • "Deal Won" Email            │
│ • Slack Webhook Alert         │   │ • Zapier Lead Webhook         │
└───────────────────────────────┘   └───────────────────────────────┘
```

The universal kernel handles the heavy infrastructure every SaaS requires. The **template** provides the business layer that defines what your SaaS actually *is* and *does* for its end users on Day 1.

---

## 🚀 Scaffolding a New SaaS with `create-saas`

### 1. Interactive Installer Mode (Recommended)
Simply run `npm run create-saas` with no arguments to launch the interactive terminal wizard:

```bash
npm run create-saas
```

The interactive installer will prompt you step-by-step:
1. **Application Branding**: App name, slug, description, and destination folder.
2. **Vertical Starter Template**: `feedback-hub`, `crm`, or `minimal`.
3. **CI/CD Integration**: Option to include GitHub Actions (`.github/workflows/ci.yml`), GitLab CI (`.gitlab-ci.yml`), or keep it unopinionated (`none`).
4. **Initial User Credentials & Tenant**: Superadmin email/password and organization name.
5. **Third-Party APIs**: Optional keys for Stripe, Resend email, and S3 storage (or Enter to skip and use local simulators).
6. **Summary & Confirmation**: Displays a preview summary before scaffolding.

---

### 2. Non-Interactive CLI Mode (Scripting / CI)
You can also run non-interactively using CLI flags or `--yes` (`-y`):

```bash
# 1. Feedback & Roadmap Board with GitHub Actions CI
npm run create-saas ../my-feedback-saas -- --name="FeedbackPulse" --slug="feedback-pulse" --template="feedback-hub" --ci=github --yes

# 2. B2B Sales Pipeline CRM
npm run create-saas ../my-crm-saas -- --name="DealFlow" --slug="deal-flow" --template="crm" --yes
```

### CLI Arguments & Options

| Option | Flag | Default | Description |
| :--- | :--- | :--- | :--- |
| **Interactive Prompt** | *(default if no flags)* | `true` | Guided terminal wizard |
| **Non-Interactive** | `--yes` / `-y` | `false` | Bypasses prompts and accepts defaults |
| **Target Directory** | Positional argument | `../<slug>` | Destination directory for the scaffolded project |
| **Application Name** | `--name="Name"` | `"FeedbackPulse"` | Brand name of your new SaaS |
| **Slug Identifier** | `--slug="slug"` | `"feedback-pulse"` | Package and URL slug |
| **Template Preset** | `--template="preset"` | `"feedback-hub"` | Vertical blueprint (`feedback-hub`, `crm`, `minimal`) |
| **CI/CD Workflow** | `--ci="provider"` | `"none"` | Generates CI workflow: `none`, `github`, or `gitlab` |
| **Superadmin Email** | `--admin-email="email"` | `admin@<slug>.dev` | Initial superadmin login email |
| **Superadmin Password** | `--admin-password="pwd"` | `AdminPass123!` | Initial superadmin login password |
| **Organization Name** | `--org="name"` | `<Name> Workspace` | Default tenant organization |
| **Stripe Secret Key** | `--stripe-key="sk_..."` | *None* | Optional Stripe key (or local simulator) |

# 3. Clean Blank Slate
npm run create-saas ../my-custom-saas -- --name="CustomKernel" --slug="custom-kernel" --template="minimal"
```

---

## 📦 What the Scaffolder Does Automatically

1. **Clones Clean Architecture**: Copies the entire monorepo (`backend/`, `admin/`, `frontend/`, `documents/`, configs) while excluding transient artifacts (`node_modules`, `.data/`, `dist/`, `.git/`, backups).
2. **Cryptographic Secret Generation**: Generates 3 independent 256-bit random secrets for `JWT_SECRET`, `SESSION_SECRET`, and `WEBHOOK_SIGNING_SECRET` into the new `.env` file.
3. **Re-brands Project**: Updates root and workspace `package.json` manifests with your application's name and description.
4. **Writes `saas-manifest.json`**: An immutable specification describing all vertical entities, field definitions, and initial configurations.
5. **Generates Target `README.md`**: Pre-configured setup instructions with exact ports, demo credentials, and endpoint references.

---

## 📋 Pre-Configured Templates

### 1. `feedback-hub` (Customer Feedback & Public Roadmap)
- **Use Case**: User feature request boards, bug trackers, and public product roadmaps.
- **Dynamic Resources**:
  - `FeedbackPost` (`/api/v1/data/feedback_posts`):
    - `title` (text, required)
    - `description` (text, required)
    - `category` (text: `feature`, `bug`, `integration`)
    - `status` (text: `under_review`, `planned`, `in_progress`, `completed`)
    - `upvotes` (number, default: 1)
    - `submitterEmail` (text, required)
  - `ProductRoadmap` (`/api/v1/data/roadmaps`):
    - `quarter` (text: e.g. "Q4 2026")
    - `theme` (text, required)
    - `status` (text: `planned`, `building`, `shipped`)
    - `isPublic` (boolean, default: true)
- **Webhooks**: Pre-configured topics for `feedback.created` and `feedback.status_updated` pings to Slack or Zapier.

### 2. `crm` (B2B Sales Pipeline)
- **Use Case**: Lead tracking, deal stages, and account value tracking.
- **Dynamic Resources**:
  - `CustomerDeal` (`/api/v1/data/deals`):
    - `title` (text, required)
    - `amount` (number, required)
    - `stage` (text: `lead`, `qualified`, `proposal`, `won`, `lost`)
    - `contactEmail` (text, required)

### 3. `minimal` (Blank Canvas)
- **Use Case**: Blank slate for a custom product idea.
- Keeps all kernel services (Auth, Tenancy, Billing, Files, Webhooks, Backups) active with an empty API Studio ready for your own custom schemas.

---

## 🪜 The Evolution Path: Dynamic Schemas to Native Code

When starting out, templates leverage QuickSaaS's **Dynamic Resource Engine**:
- Zero database migrations needed to get started.
- Instant REST endpoints (`GET`, `POST`, `PATCH`, `DELETE /api/v1/data/{resource}`).
- Automatically generated tables and forms in both the Admin Portal and Customer App.

When your business logic becomes complex:
1. Navigate to **API Studio** in the Admin Portal.
2. Click **Promote to Code**.
3. QuickSaaS automatically generates a complete TypeScript **Drizzle ORM schema table definition** (`export const feedback_posts = pgTable(...)`).
4. Paste the schema into `backend/src/db/schema/` to take full manual code ownership without breaking existing API contracts.
