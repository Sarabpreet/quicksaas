# ADR-0005: Dual Authentication: JWT Sessions & Cryptographic API Keys

## Context
A modern SaaS platform serves two fundamentally distinct types of actors:
1. **Interactive Human Users**: Developers, team members, and admins logging into web/mobile interfaces requiring session lifespans, RBAC role enforcement, tenant workspace switching, and profile state.
2. **Programmatic / Machine Integrations**: External scripts, CI pipelines, webhooks, and third-party APIs requiring long-lived, revokable, low-latency authentication tokens.

Conflating these two models (e.g., using permanent JWTs or requiring human login sessions for API scripts) introduces security vulnerabilities and operational overhead.

## Decision
We implement a **Dual Authentication Model**:
1. **User JWT Authentication (`Bearer <jwt>`)**:
   - Short-lived JSON Web Tokens signed with HMAC-SHA256 (`JWT_SECRET`).
   - Carries identity claims (`userId`, `email`, `isSuperadmin`, `activeOrganizationId`, `role`).
   - Validated on interactive routes and authenticated via `Authorization: Bearer <token>`.
2. **Programmatic API Keys (`X-API-Key: qs_live_...`)**:
   - High-entropy cryptographic random keys prefixed with `qs_live_` (identifiable by secret scanning algorithms).
   - Only the SHA-256 hash is persisted in the database; raw secret is displayed only once upon generation.
   - Keys are strictly bound to a tenant `organization_id` and granular `scopes` (e.g., `["*"]`, `["read"]`, `["write"]`).
   - Immediate revocation: revoking a key sets `revoked_at`, instantly denying subsequent requests (HTTP 401).

## Consequences
- **Positive**: Clean separation of concerns between interactive human sessions and automated developer integrations.
- **Positive**: Industry-standard developer experience: prefixed tokens allow automated secret detectors (GitHub Secret Scanning) to prevent credential leaks.
- **Positive**: Zero risk of database credential compromise: stored API key hashes cannot be decrypted to reveal the raw token.
- **Negative**: Requires maintaining two authentication verification middleware hooks in Fastify (`authenticate` and `authenticateApiKey`).
