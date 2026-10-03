# ADR-0004: Dynamic Resource Engine with 1-Click Code Promotion

## Context
Developers building new SaaS applications face an unavoidable dilemma:
- **No-Code / Low-Code Engines**: Allow rapid prototyping and dynamic schema generation without writing code, but result in architectural dead-ends when business logic becomes too complex for visual builders.
- **Pure Code Models**: Provide infinite flexibility and complete control over database schemas and business logic, but require writing tedious boilerplate (migrations, schemas, controllers, DTOs, admin tables) for standard CRUD entities.

## Decision
We implement a hybrid architecture: **Dynamic Resource Engine (API Studio) with an explicit 1-click Code Promotion Escape Hatch**:
1. **Dynamic Engine (0-to-1 Velocity)**:
   - Administrators can define custom resources (`Customer`, `Ticket`, `FeedbackPost`) through the Admin UI or REST API.
   - Resource definitions store field metadata (name, type, required, unique, default) in `resource_definitions`.
   - The runtime dynamically provisions `/api/v1/data/{slug}` endpoints with validation, multi-tenant isolation, filtering, sorting, and pagination.
2. **Code Promotion Escape Hatch (Infinite Extensibility)**:
   - When a resource outgrows simple dynamic CRUD and requires complex hooks, third-party syncing, or domain algorithms, developers click **"Promote to Code"** in the Admin UI (or `POST /api/v1/resources/:id/promote`).
   - The engine generates a clean, type-safe TypeScript Drizzle ORM schema file (`export const <tableName> = pgTable(...)`).
   - The resource transitions seamlessly from metadata-driven to code-owned without breaking existing REST API contracts or client integrations.

## Consequences
- **Positive**: Blazing initial delivery velocity. A complete vertical SaaS can be provisioned in minutes without writing backend boilerplate.
- **Positive**: Zero vendor lock-in or architectural ceiling. When requirements become complex, developers exit to standard TypeScript Drizzle code.
- **Positive**: Preserves API contract compatibility across promotion.
- **Negative**: Dynamic JSON schema evaluation incurs minor runtime overhead compared to statically compiled SQL statements (mitigated once promoted to code).
