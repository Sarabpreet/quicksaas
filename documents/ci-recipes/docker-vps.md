# VPS & Direct Server Deployment Recipe

If you are deploying QuickSaaS directly to a VPS (e.g. DigitalOcean, Hetzner, AWS EC2, Coolify, or Dokku) without using an external CI/CD runner, you can use standard server-side scripts.

---

## 🛠️ Direct Server Deployment Script (`deploy.sh`)

Create `deploy.sh` on your server:

```bash
#!/usr/bin/env bash
set -e

echo "🚀 Deploying QuickSaaS Update..."

# 1. Pull latest code
git pull origin main

# 2. Install production dependencies
npm ci

# 3. Quality Gate: Run tests before applying migrations or building
echo "🧪 Running quality gate tests..."
npm test

# 4. Capture automated pre-deployment backup
echo "📦 Capturing pre-deployment snapshot..."
npm run backup "Pre-Deploy $(date +'%Y-%m-%d %H:%M')"

# 5. Apply database schema migrations
echo "🗄️ Applying Drizzle migrations..."
npm run db:migrate

# 6. Build production bundles
echo "🏗️ Building production artifacts..."
npm run build

# 7. Restart services (e.g. via PM2, systemd, or Docker)
echo "🔄 Reloading process manager..."
# If using PM2:
# pm2 restart ecosystem.config.cjs
# Or if using systemd:
# sudo systemctl restart quicksaas-backend

echo "✅ QuickSaaS deployed successfully!"
```

---

## ⚡ Using with Webhook Triggers
You can trigger `deploy.sh` automatically whenever a commit is pushed using a lightweight webhook listener (like `adnanh/webhook` or GitHub Webhooks):
- GitHub Webhook payload -> Hits server endpoint `:9000/hooks/deploy` -> Runs `deploy.sh`.
- If `npm test` fails, the script halts immediately (`set -e`), leaving the existing live process running and untouched.
