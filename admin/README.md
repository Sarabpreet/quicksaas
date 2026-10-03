# QuickSaaS Admin Portal

An internal operations UI and visual API Studio for the QuickSaaS headless kernel. Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Lucide icons.

## Features

- **Platform Dashboard:** Live system health indicator (embedded PostgreSQL + Redis), real-time metric aggregates.
- **API Studio:** Define dynamic CRUD resources with typed fields (`text`, `number`, `boolean`, `date`, `json`) without writing backend code.
- **Promotion to Code:** 1-click generation of static TypeScript Drizzle ORM schemas and module hints.
- **Dynamic Data Explorer:** Auto-generated CRUD data tables and modal forms tailored to each resource schema with search, pagination, and sorting.
- **Organizations & RBAC:** Multi-tenant workspace switcher, member directory with role hierarchy (`owner`, `admin`, `member`, `viewer`), and secure invite tokens.
- **Users Directory:** Platform-wide user management and superadmin badges.
- **Background Jobs Console:** Monitor queued, processing, completed, and failed tasks; trigger worker processing; replay failed jobs.
- **Webhooks Dispatcher:** Manage endpoints, inspect HMAC-SHA256 signatures, dispatch test pings, and view delivery history.
- **Transactional Email Studio:** Live template previews with variable interpolation (`{{name}}`), test dispatches, and delivery logs.
- **Feature Flags:** Toggle platform and tenant features in real-time.
- **Audit Trail:** Immutable actor, timestamp, IP, action, and JSON metadata viewer.
- **API Keys:** Generate high-entropy bearer keys (`qs_live_...`) with automatic hashing and instant revocation.
- **Settings:** Organization-scoped JSON configuration editor.

## Getting Started

1. **Install dependencies:**
   ```bash
   cd admin
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Admin Portal runs at: `http://localhost:5173` (proxies `/api` and `/health` to backend at `http://localhost:4000`).

3. **Login with Demo Accounts:**
   - **Superadmin:** `superadmin@quicksaas.dev` / `AdminPass123!`
   - **Founder:** `founder@startup.io` / `StartupPass123!`
   - **Viewer:** `viewer@startup.io` / `ViewerPass123!`
   *(Or click any of the 1-click demo login buttons on the login screen)*
