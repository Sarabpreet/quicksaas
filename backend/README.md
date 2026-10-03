# QuickSaaS Backend API

A headless, copy-first SaaS core API featuring multi-tenancy, auth, background Redis integration, and an API Studio dynamic Resource Engine with promotion to code.

## 🚀 Zero-Docker Quickstart

1. **Install dependencies** (from `backend/` directory):
   ```bash
   npm install
   ```

2. **Environment Variables**:
   By default, it uses embedded **PGlite** (in `.data/postgres`) and connects to local Redis if available.
   ```bash
   cp .env.example .env
   ```

3. **Database Migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - API Server: `http://localhost:4000`
   - Interactive OpenAPI/Swagger Docs: `http://localhost:4000/documentation`

## 🗄️ Database & Migrations

- **Embedded Postgres (PGlite)**: Data is persisted under `backend/.data/postgres`.
- **External Postgres**: Provide `DATABASE_URL=postgresql://user:pass@host:5432/dbname` in `.env`.
- **Generate Migrations**: `npm run db:generate`
- **Apply Migrations**: `npm run db:migrate`
- **Drizzle Studio UI**: `npm run db:studio`

## 🧩 Core Endpoints Implemented

- `GET /health`: Health check for Fastify, PostgreSQL, and Redis
- `POST /api/v1/auth/register`: Create user + tenant organization + owner role
- `POST /api/v1/auth/login`: Issue JWT token
- `GET /api/v1/auth/me`: Authenticated profile + organization list
- `GET /api/v1/organizations`: List organizations
- `POST /api/v1/organizations`: Create organization
- `GET /api/v1/organizations/:id/members`: Organization RBAC members
- **API Studio (Resource Engine)**:
  - `GET /api/v1/resources`: List schema definitions
  - `POST /api/v1/resources`: Define dynamic resource (e.g. `Customer`)
  - `POST /api/v1/resources/:id/promote`: Export resource into TypeScript Drizzle schema
- **Dynamic CRUD Runtime**:
  - `GET /api/v1/data/:resource`: List records (tenant isolated)
  - `POST /api/v1/data/:resource`: Create record with schema validation
  - `GET /api/v1/data/:resource/:id`: Read record
  - `PATCH /api/v1/data/:resource/:id`: Update record
  - `DELETE /api/v1/data/:resource/:id`: Delete record
