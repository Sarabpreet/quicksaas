# QuickSaaS Production Infrastructure (`infra/`)

This directory provides container definitions, orchestration manifests, and edge reverse proxy configurations for deploying QuickSaaS to any container platform, cloud provider, or bare-metal VPS.

---

## 🏗️ Architecture Overview

```text
               Internet (Client Requests)
                           │
                           ▼
                  Edge Reverse Proxy
                (Caddy or Nginx :80/:443)
              ┌────────────┼────────────┐
              │ /api/*     │ /admin/*   │ /*
              ▼            ▼            ▼
         Backend API    Admin UI    Frontend App
          (Fastify)      (SPA)         (SPA)
          Port 4000     Port 80       Port 80
              │
      ┌───────┴───────┬────────────────┐
      ▼               ▼                ▼
PostgreSQL 16      Redis 7       MinIO (S3)
(Database)       (Queue/Cache) (Files & Backups)
      ▲
      │
Cron Worker Daemon
 (Background Tasks)
```

---

## 🚀 Quick Start Options

### Option A: Complete Standalone Stack (Production or Local Docker)
Deploys the full stack including database, cache, storage, backend API, cron worker, frontend, admin, and edge reverse proxy with a single command:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

**Exposed Services**:
- **Unified Gateway**: `http://localhost` (or `https://yourdomain.com`)
  - `http://localhost/` $\rightarrow$ Customer Workspace App
  - `http://localhost/admin` $\rightarrow$ Operations Admin Portal
  - `http://localhost/api/v1/*` $\rightarrow$ Fastify REST API
  - `http://localhost/documentation` $\rightarrow$ Interactive OpenAPI Swagger Docs
  - `http://localhost/health` $\rightarrow$ System Health & Status Probe
- **Direct Service Ports (Optional Access)**:
  - Backend API: `http://localhost:4000`
  - Admin Portal: `http://localhost:5173`
  - Customer App: `http://localhost:3001`
  - PostgreSQL 16: `localhost:5432`
  - Redis 7: `localhost:6379`
  - MinIO S3 API: `http://localhost:9000`
  - MinIO Web Console: `http://localhost:9001` (User: `minioadmin`, Password: `minioadmin`)

---

### Option B: Local Dependencies Only (Hybrid Development)
If you prefer running the application code on your host machine (`npm run dev`) while using real containerized PostgreSQL, Redis, and MinIO:

```bash
# 1. Start external Postgres, Redis, and MinIO containers
docker compose -f infra/docker-compose.deps-only.yml up -d

# 2. Point backend to the running containers
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/quicksaas"
export REDIS_URL="redis://localhost:6379"
export S3_ENDPOINT="http://localhost:9000"

# 3. Apply schema migrations & seed custom credentials
npm run db:migrate
npm run db:seed

# 4. Start host dev servers
npm run dev
```

---

## 📦 Container Buildfiles

| File | Base Image | Purpose | Exposed Port |
| :--- | :--- | :--- | :---: |
| [`Dockerfile.backend`](Dockerfile.backend) | `node:22-alpine` | Multi-stage build for Fastify REST API | `4000` |
| [`Dockerfile.cron`](Dockerfile.cron) | `node:22-alpine` | Standalone queue worker & cron schedules daemon | N/A (Daemon) |
| [`Dockerfile.admin`](Dockerfile.admin) | `nginx:alpine` | Static SPA build of Operations Admin Portal | `80` |
| [`Dockerfile.frontend`](Dockerfile.frontend) | `nginx:alpine` | Static SPA build of Customer Workspace App | `80` |
| [`Caddyfile`](Caddyfile) | `caddy:2-alpine` | Edge reverse proxy with automated TLS | `80`, `443` |
| [`nginx.conf`](nginx.conf) | `nginx:alpine` | Traditional reverse proxy configuration | `80` |

---

## ⚙️ Environment Variables Reference

When deploying in production, configure the following environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@postgres:5432/quicksaas` |
| `REDIS_URL` | Redis cache and queue broker URL | `redis://redis:6379` |
| `JWT_SECRET` | Secret key for signing user session tokens | *(Required in Production)* |
| `PORT` | Fastify API HTTP listening port | `4000` |
| `HOST` | Fastify network interface binding | `0.0.0.0` |
| `S3_ENDPOINT` | S3-compatible object storage endpoint | `http://minio:9000` |
| `S3_ACCESS_KEY` | S3 access key / username | `minioadmin` |
| `S3_SECRET_KEY` | S3 secret access key / password | `minioadmin` |
| `S3_BUCKET` | Primary S3 bucket for tenant files | `quicksaas-files` |
| `STRIPE_SECRET_KEY` | Stripe API Secret Key for billing | *(Optional / Sim mode)* |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook signing secret | *(Optional)* |

---

## 🛡️ Disaster Recovery in Containers

### Triggering an Automated Backup
Run the backup script directly or execute inside the backend container:

```bash
docker exec -it quicksaas-backend npm run backup
```

Snapshots are cryptographically signed with SHA-256 and stored in the persistent volume `/app/storage/backups`.

### Restoring from a Snapshot
To restore a snapshot in a containerized environment:

```bash
docker exec -it quicksaas-backend npm run restore -- <snapshot_id>
```
