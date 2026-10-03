# ADR-0003: Headless API Boundary with Equal Frontend Clients

## Context
Many SaaS frameworks bundle frontend and backend logic into a monolithic full-stack framework (e.g., Next.js Server Actions, Remix loaders, Laravel Blade). While convenient for simple monolithic apps, this creates severe architectural limitations:
1. Internal operations (Admin) and customer applications (Tenant App) often require radically different layout systems, authorization rules, security perimeters, and deployment targets.
2. Building native mobile apps, CLI utilities, third-party integrations, or embedded webhooks requires duplicating logic that was tightly coupled to Server Components.
3. Administrative operations often bypass business logic validations, creating security vulnerabilities and inconsistent audit logs.

## Decision
We enforce a **strict headless REST API architecture** (`backend/`):
- The Fastify backend is the **single source of truth** for all business rules, authorization, database mutations, and audit logs.
- The Admin UI (`admin/`) and Customer App (`frontend/`) are **equal consumers** of the REST API. Neither client has direct database access.
- All administrative capabilities (platform stats, dynamic schema definition, backups, tenant overrides) are exposed via documented `/api/v1/admin/*` endpoints guarded by Superadmin RBAC policies.
- Every API endpoint is automatically documented via OpenAPI/Swagger (`GET /documentation`).

## Consequences
- **Positive**: Complete UI decoupling. Frontends can be deployed independently to CDNs (Cloudflare Pages, Vercel, S3) while the API runs on a container or VPS.
- **Positive**: Comprehensive OpenAPI specifications are automatically generated for SDK generation and external API consumers.
- **Positive**: Strict, audited security boundary. All mutations flow through centralized validation schemas and authorization hooks.
- **Negative**: Requires maintaining explicit REST endpoints and CORS headers rather than utilizing framework-specific server actions.
