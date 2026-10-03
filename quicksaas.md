# SaaS Kernel - Detailed Project Report

Version 1.0 - 02 October 2026

## Executive summary
Build a copy-first, headless SaaS platform whose backend is the single business/API boundary and whose admin is simply another frontend client. The core accelerator is a Resource Engine that can create CRUD resources, REST endpoints, OpenAPI definitions and admin screens from metadata, with an explicit promotion path to code-owned modules when business logic becomes complex.

## Core architecture
```text
frontend / admin / mobile / third-party
              |
           REST API
              |
           backend
       /       |        \
 PostgreSQL  Redis   S3/MinIO
              |
            worker
```

## Root folders
- `frontend/` customer app
- `admin/` internal operations UI
- `backend/` headless API and all core business logic
- `cron/` queues, workers and schedules
- `packages/` shared types/schemas/UI/config
- `documents/` markdown documentation and ADRs
- `infra/` Docker, database, Redis, object storage, proxy, monitoring, backups
- `tests/` integration and E2E suites

## V1 kernel modules
Auth; Organizations; Access/RBAC/Policies; Resource Engine; Files; Email; Notifications; Jobs; Audit; Webhooks; API Keys; Settings; Feature Flags; Observability.

## API Studio
Admin can create a standard CRUD resource by defining fields, relations, validation, permissions and API actions. Publishing creates a server-side resource definition. The runtime exposes:

```text
GET    /api/v1/{resource}
GET    /api/v1/{resource}/:id
POST   /api/v1/{resource}
PATCH  /api/v1/{resource}/:id
DELETE /api/v1/{resource}/:id
```

Filtering, sorting, search, pagination, OpenAPI, audit and authorization use a shared contract. Complex logic remains explicit code. Dynamic resources can be exported as blueprints or promoted to code.

## Email engine
Transactional email is a first-class service. Application events enqueue messages; workers render templates and call provider adapters. Admin provides template management, preview, test send, delivery/failure logs and provider configuration. Marketing campaigns are out of scope for V1.

## Testing blueprint
- Unit tests for policy evaluation, validation, resource parsing, email rendering and retry logic.
- Integration tests for API/database, storage, Redis and provider adapters.
- Contract tests for OpenAPI and generated routes.
- E2E tests for login, organizations, resource CRUD, admin, files and email jobs.
- Security tests for tenant isolation, privilege escalation, API key revocation, signed URLs, webhook signatures and token reuse.
- Performance tests for representative list/write/job workloads.

## Critical success scenarios
1. Fresh bootstrap works from a clean clone.
2. Admin creates a Customer resource without backend code.
3. Two organizations cannot access each other’s records.
4. Viewer cannot perform write operations.
5. Files upload via object storage and use signed URLs.
6. Registration triggers queued email verification.
7. Failed jobs retry, become inspectable and can be replayed.
8. Resource events trigger signed webhooks.
9. API key revocation blocks access.
10. A complex resource can be promoted to code without breaking the API contract.
11. Backup/restore procedure succeeds.
12. A sample SaaS can be built from a fresh copy using the kernel.

## Quality gates
G0 bootstrap; G1 identity; G2 security; G3 resource engine; G4 admin; G5 communications/jobs; G6 operations; G7 copy test.

## Definition of done
The kernel is done when a clean clone boots, auth/tenant boundaries are secure, dynamic CRUD resources can be created, Admin is API-only, files/email/jobs/webhooks are operational, audit and observability exist, backups have been restored successfully, CI runs the required suites, and a small sample SaaS has been built without rewriting kernel services.
