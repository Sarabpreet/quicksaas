import fs from "fs";
import path from "path";
import crypto from "crypto";
import readline from "readline/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateSaasOptions {
  targetDir: string;
  name: string;
  slug: string;
  description: string;
  githubRepo: string;
  primaryColor: string;
  template: "feedback-hub" | "crm" | "minimal";
  ciProvider: "none" | "github" | "gitlab";
  superadminName: string;
  superadminEmail: string;
  superadminPassword: string;
  orgName: string;
  storageDriver: "local" | "s3";
  storageLocalDir?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  databaseUrl?: string;
  redisUrl?: string;
  stripeKey?: string;
  emailApiKey?: string;
  nonInteractive?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `QsAdmin_${pass}`;
}

function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim());
}

function adjustHexBrightness(hex: string, percent: number): string {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

async function promptInstaller(defaults: Partial<CreateSaasOptions>): Promise<CreateSaasOptions> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  ✨ QuickSaaS - Interactive SaaS Creator & Scaffolder        │
│  The copy-first headless SaaS platform installer             │
└──────────────────────────────────────────────────────────────┘
Configure your new SaaS project. Press Enter to accept [defaults].
`);

  // 1. Site Branding & Meta
  console.log(`🏷️  Application & Branding:`);
  const rawName = await rl.question(`   Application / Site Name [${defaults.name || "FeedbackPulse"}]: `);
  const name = rawName.trim() || defaults.name || "FeedbackPulse";

  const defaultSlug = slugify(name);
  const rawSlug = await rl.question(`   Application Slug [${defaultSlug}]: `);
  const slug = rawSlug.trim() || defaultSlug;

  const defaultDesc = name === "FeedbackPulse"
    ? "Customer Feedback & Feature Voting SaaS"
    : `${name} SaaS Platform`;
  const rawDesc = await rl.question(`   Description [${defaultDesc}]: `);
  const description = rawDesc.trim() || defaultDesc;

  const defaultRepo = `https://github.com/myorg/${slug}`;
  const rawRepo = await rl.question(`   GitHub Repository URL [${defaultRepo}]: `);
  const githubRepo = rawRepo.trim() || defaultRepo;

  let primaryColor = "#6366f1";
  while (true) {
    const rawColor = await rl.question(`   Primary Brand Color Hex [#6366f1]: `);
    const colorCandidate = rawColor.trim() || "#6366f1";
    if (isValidHexColor(colorCandidate)) {
      primaryColor = colorCandidate.startsWith("#") ? colorCandidate : `#${colorCandidate}`;
      break;
    }
    console.log("   ⚠️  Invalid HEX color format. Please enter a valid hex, e.g. #6366f1 or #3b82f6.");
  }

  const defaultTarget = path.resolve(process.cwd(), `../${slug}`);
  const rawTarget = await rl.question(`   Destination Directory [${defaultTarget}]: `);
  const targetDir = path.resolve(process.cwd(), rawTarget.trim() || defaultTarget);

  // 2. Vertical Template
  console.log(`
🎨 Choose a Vertical Starter Template:
   1) feedback-hub  (Customer Feedback, Feature Voting & Public Roadmap) [default]
   2) crm           (B2B Sales Pipeline & Deal Tracker)
   3) minimal       (Clean Slate / Empty API Studio)
`);
  const rawTemplate = await rl.question(`   Select template (1-3) [1]: `);
  let template: "feedback-hub" | "crm" | "minimal" = "feedback-hub";
  if (rawTemplate.trim() === "2" || rawTemplate.trim().toLowerCase() === "crm") {
    template = "crm";
  } else if (rawTemplate.trim() === "3" || rawTemplate.trim().toLowerCase() === "minimal") {
    template = "minimal";
  }

  // 3. CI/CD
  console.log(`
⚙️  CI/CD Integration:
   1) none    (Unopinionated - no CI files injected) [default]
   2) github  (GitHub Actions: .github/workflows/ci.yml)
   3) gitlab  (GitLab CI: .gitlab-ci.yml)
`);
  const rawCi = await rl.question(`   Select CI/CD workflow (1-3) [1]: `);
  let ciProvider: "none" | "github" | "gitlab" = "none";
  if (rawCi.trim() === "2" || rawCi.trim().toLowerCase() === "github") {
    ciProvider = "github";
  } else if (rawCi.trim() === "3" || rawCi.trim().toLowerCase() === "gitlab") {
    ciProvider = "gitlab";
  }

  // 4. Initial Superadmin & Workspace Credentials
  console.log(`\n👤 Initial Superadmin & Workspace Credentials:`);
  const rawAdminName = await rl.question(`   Superadmin Full Name [Platform Administrator]: `);
  const superadminName = rawAdminName.trim() || "Platform Administrator";

  const defaultAdminEmail = `admin@${slug}.dev`;
  const rawAdminEmail = await rl.question(`   Superadmin Email [${defaultAdminEmail}]: `);
  const superadminEmail = rawAdminEmail.trim() || defaultAdminEmail;

  const suggestedPassword = generateSecurePassword();
  const rawAdminPass = await rl.question(`   Superadmin Password [${suggestedPassword}]: `);
  const superadminPassword = rawAdminPass.trim() || suggestedPassword;

  const defaultOrgName = `${name} Workspace`;
  const rawOrgName = await rl.question(`   Initial Organization Name [${defaultOrgName}]: `);
  const orgName = rawOrgName.trim() || defaultOrgName;

  // 5. Storage Infrastructure (Local EC2 EBS vs S3)
  console.log(`
📦 Storage Configuration:
   1) local  (Local Disk / Attached EC2 EBS Volume, e.g. ./storage) [default]
   2) s3     (AWS S3 / MinIO / Cloudflare R2 Object Storage)
`);
  const rawStorage = await rl.question(`   Select storage driver (1-2) [1]: `);
  let storageDriver: "local" | "s3" = "local";
  let storageLocalDir: string | undefined = "./storage";
  let s3Bucket: string | undefined;
  let s3Region: string | undefined;
  let s3AccessKey: string | undefined;
  let s3SecretKey: string | undefined;
  let s3Endpoint: string | undefined;

  if (rawStorage.trim() === "2" || rawStorage.trim().toLowerCase() === "s3") {
    storageDriver = "s3";
    const rawBucket = await rl.question(`   AWS S3 Bucket Name [${slug}-files]: `);
    s3Bucket = rawBucket.trim() || `${slug}-files`;

    const rawRegion = await rl.question(`   AWS Region [us-east-1]: `);
    s3Region = rawRegion.trim() || "us-east-1";

    const rawKey = await rl.question(`   AWS Access Key ID [leave empty if IAM role]: `);
    s3AccessKey = rawKey.trim() || undefined;

    const rawSecret = await rl.question(`   AWS Secret Access Key [leave empty if IAM role]: `);
    s3SecretKey = rawSecret.trim() || undefined;

    const rawEndpoint = await rl.question(`   Custom S3 Endpoint (optional, e.g. for MinIO/R2): `);
    s3Endpoint = rawEndpoint.trim() || undefined;
  } else {
    const rawDir = await rl.question(`   Local Storage Directory Path [./storage]: `);
    storageLocalDir = rawDir.trim() || "./storage";
  }

  // 6. Database Configuration
  console.log(`
🗄️  Database & Redis Configuration:
   1) zero-docker  (Embedded PostgreSQL PGlite + In-Memory/Local Redis) [default]
   2) external     (External PostgreSQL / AWS RDS & Redis / ElastiCache)
`);
  const rawDbMode = await rl.question(`   Select database mode (1-2) [1]: `);
  let databaseUrl: string | undefined;
  let redisUrl: string | undefined;
  if (rawDbMode.trim() === "2" || rawDbMode.trim().toLowerCase() === "external") {
    const rawDbUrl = await rl.question(`   PostgreSQL Connection URL: `);
    databaseUrl = rawDbUrl.trim() || undefined;

    const rawRedisUrl = await rl.question(`   Redis Connection URL [redis://127.0.0.1:6379]: `);
    redisUrl = rawRedisUrl.trim() || "redis://127.0.0.1:6379";
  }

  // 7. Optional Third-Party APIs
  console.log(`\n🔌 Third-Party APIs (Optional - Press Enter to use local simulation mode):`);
  const rawStripe = await rl.question(`   Stripe Secret Key (sk_test_...) [leave empty for simulation]: `);
  const stripeKey = rawStripe.trim() || undefined;

  const rawEmailKey = await rl.question(`   Resend / Transactional Email API Key [leave empty for logger]: `);
  const emailApiKey = rawEmailKey.trim() || undefined;

  // Summary Card
  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  📋 Installation & Scaffolding Summary                       │
├──────────────────────────────────────────────────────────────┤
│  Site Name    : ${name.padEnd(44)} │
│  Slug         : ${slug.padEnd(44)} │
│  Brand Color  : ${primaryColor.padEnd(44)} │
│  GitHub Repo  : ${githubRepo.slice(0, 44).padEnd(44)} │
│  Template     : ${template.padEnd(44)} │
│  CI/CD        : ${ciProvider.padEnd(44)} │
│  Destination  : ${targetDir.slice(0, 44).padEnd(44)} │
│  Admin Name   : ${superadminName.padEnd(44)} │
│  Admin Email  : ${superadminEmail.padEnd(44)} │
│  Admin Pass   : ${superadminPassword.padEnd(44)} │
│  Organization : ${orgName.padEnd(44)} │
│  Storage Mode : ${(storageDriver === "s3" ? `S3 (${s3Bucket})` : `Local (${storageLocalDir})`).padEnd(44)} │
│  Database     : ${(databaseUrl ? "External PostgreSQL" : "Zero-Docker Embedded PGlite").padEnd(44)} │
│  Stripe Mode  : ${(stripeKey ? "Configured Live API" : "Local Simulator Engine").padEnd(44)} │
│  Email Mode   : ${(emailApiKey ? "Configured Live API" : "Local Async Logger").padEnd(44)} │
└──────────────────────────────────────────────────────────────┘
`);

  const confirm = await rl.question(`Proceed with scaffolding? (Y/n): `);
  rl.close();

  if (confirm.trim().toLowerCase() === "n" || confirm.trim().toLowerCase() === "no") {
    console.log("❌ Installation cancelled by user.");
    process.exit(0);
  }

  return {
    targetDir,
    name,
    slug,
    description,
    githubRepo,
    primaryColor,
    template,
    ciProvider,
    superadminName,
    superadminEmail,
    superadminPassword,
    orgName,
    storageDriver,
    storageLocalDir,
    s3Bucket,
    s3Region,
    s3AccessKey,
    s3SecretKey,
    s3Endpoint,
    databaseUrl,
    redisUrl,
    stripeKey,
    emailApiKey,
  };
}

function parseCliArgs(): CreateSaasOptions {
  const args = process.argv.slice(2);
  let targetDir = "";
  let name = "FeedbackPulse";
  let slug = "feedback-pulse";
  let description = "Customer Feedback & Feature Voting SaaS";
  let githubRepo = "https://github.com/myorg/feedback-pulse";
  let primaryColor = "#6366f1";
  let template: "feedback-hub" | "crm" | "minimal" = "feedback-hub";
  let ciProvider: "none" | "github" | "gitlab" = "none";
  let superadminName = "Platform Administrator";
  let superadminEmail = "superadmin@quicksaas.dev";
  let superadminPassword = "AdminPass123!";
  let orgName = "Startup Labs";
  let storageDriver: "local" | "s3" = "local";
  let storageLocalDir = "./storage";
  let s3Bucket: string | undefined;
  let s3Region: string | undefined;
  let s3AccessKey: string | undefined;
  let s3SecretKey: string | undefined;
  let s3Endpoint: string | undefined;
  let databaseUrl: string | undefined;
  let redisUrl: string | undefined;
  let stripeKey: string | undefined;
  let emailApiKey: string | undefined;
  let nonInteractive = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      console.log(`
QuickSaaS Installer & Scaffolder CLI

USAGE:
  npm run create-saas [targetDir] [options]

ARGUMENTS:
  targetDir                  Target directory for the new SaaS project

OPTIONS:
  -y, --yes                  Bypass interactive prompts and use defaults / passed flags
  --name=<string>            Application display name (default: FeedbackPulse)
  --slug=<string>            Application URL/kebab slug (default: feedback-pulse)
  --desc=<string>            Project description
  --color=<hex>              Primary brand color hex (default: #6366f1)
  --repo=<url>               GitHub repository URL or user/repo slug
  --template=<type>          Starter template: feedback-hub | crm | minimal
  --ci=<provider>            CI/CD workflow: none | github | gitlab
  --admin-name=<string>      Initial superadmin account full name
  --admin-email=<string>     Initial superadmin account email
  --admin-password=<str>     Initial superadmin account password
  --org=<string>             Initial organization / workspace name
  --storage=<local|s3>       Storage driver: local | s3
  --storage-dir=<path>       Local storage directory path (default: ./storage)
  --s3-bucket=<name>         S3 Bucket Name (if storage=s3)
  --s3-region=<region>       S3 AWS Region (default: us-east-1)
  --s3-endpoint=<url>        Custom S3 endpoint (for MinIO or Cloudflare R2)
  --db-url=<url>             PostgreSQL database URL (omit for embedded PGlite)
  --redis-url=<url>          Redis URL (omit for local/memory fallback)
  --stripe-key=<string>      Optional Stripe secret key
  --email-key=<string>       Optional Transactional Email API key
  -h, --help                 Show this help message
`);
      process.exit(0);
    } else if (!arg.startsWith("--") && !targetDir) {
      targetDir = arg;
    } else if (arg === "-y" || arg === "--yes" || arg === "--non-interactive") {
      nonInteractive = true;
    } else if (arg.startsWith("--name=")) {
      name = arg.split("=")[1];
    } else if (arg === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (arg.startsWith("--slug=")) {
      slug = arg.split("=")[1];
    } else if (arg === "--slug" && args[i + 1]) {
      slug = args[++i];
    } else if (arg.startsWith("--desc=")) {
      description = arg.split("=")[1];
    } else if (arg.startsWith("--color=")) {
      primaryColor = arg.split("=")[1];
    } else if (arg.startsWith("--repo=")) {
      githubRepo = arg.split("=")[1];
    } else if (arg.startsWith("--template=")) {
      template = arg.split("=")[1] as any;
    } else if (arg === "--template" && args[i + 1]) {
      template = args[++i] as any;
    } else if (arg.startsWith("--ci=")) {
      ciProvider = arg.split("=")[1] as any;
    } else if (arg.startsWith("--admin-name=")) {
      superadminName = arg.split("=")[1];
    } else if (arg.startsWith("--admin-email=")) {
      superadminEmail = arg.split("=")[1];
    } else if (arg.startsWith("--admin-password=")) {
      superadminPassword = arg.split("=")[1];
    } else if (arg.startsWith("--org=")) {
      orgName = arg.split("=")[1];
    } else if (arg.startsWith("--storage=")) {
      storageDriver = arg.split("=")[1] as any;
    } else if (arg.startsWith("--storage-dir=")) {
      storageLocalDir = arg.split("=")[1];
    } else if (arg.startsWith("--s3-bucket=")) {
      s3Bucket = arg.split("=")[1];
    } else if (arg.startsWith("--s3-region=")) {
      s3Region = arg.split("=")[1];
    } else if (arg.startsWith("--s3-endpoint=")) {
      s3Endpoint = arg.split("=")[1];
    } else if (arg.startsWith("--db-url=")) {
      databaseUrl = arg.split("=")[1];
    } else if (arg.startsWith("--redis-url=")) {
      redisUrl = arg.split("=")[1];
    } else if (arg.startsWith("--stripe-key=")) {
      stripeKey = arg.split("=")[1];
    } else if (arg.startsWith("--email-key=")) {
      emailApiKey = arg.split("=")[1];
    }
  }

  if (!targetDir) {
    targetDir = path.resolve(process.cwd(), `../${slug}`);
  } else {
    targetDir = path.resolve(process.cwd(), targetDir);
  }

  return {
    targetDir,
    name,
    slug,
    description,
    githubRepo,
    primaryColor,
    template,
    ciProvider,
    superadminName,
    superadminEmail,
    superadminPassword,
    orgName,
    storageDriver,
    storageLocalDir,
    s3Bucket,
    s3Region,
    s3AccessKey,
    s3SecretKey,
    s3Endpoint,
    databaseUrl,
    redisUrl,
    stripeKey,
    emailApiKey,
    nonInteractive,
  };
}

function copyDirectory(src: string, dest: string, ignoreList: string[]) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (ignoreList.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, ignoreList);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export async function createSaas(options: CreateSaasOptions) {
  console.log(`\n🚀 Scaffolding new SaaS project '${options.name}' at:`);
  console.log(`   ${options.targetDir}\n`);

  if (fs.existsSync(options.targetDir)) {
    const files = fs.readdirSync(options.targetDir);
    if (files.length > 0) {
      console.error(`❌ Error: Target directory '${options.targetDir}' is not empty.`);
      process.exit(1);
    }
  }

  const rootSource = path.resolve(__dirname, "..");

  const ignoreList = [
    "node_modules",
    ".git",
    "dist",
    ".data",
    "storage",
    "test-results",
    "playwright-report",
    ".DS_Store",
    "dump.rdb",
    "saas-manifest.json",
    ".env",
  ];

  // 1. Copy Files
  console.log("📁 Copying template core packages (backend, admin, frontend, cron, packages, infra)...");
  copyDirectory(rootSource, options.targetDir, ignoreList);

  // 2. Synchronize Tailwind CSS Theme Colors
  console.log(`🎨 Synchronizing Tailwind CSS theme with brand color (${options.primaryColor})...`);
  const hoverColor = adjustHexBrightness(options.primaryColor, -0.12);
  const activeColor = adjustHexBrightness(options.primaryColor, -0.2);
  const lightColor = adjustHexBrightness(options.primaryColor, 0.15);

  const tailwindThemeBlock = `
@theme {
  --color-primary: ${options.primaryColor};
  --color-primary-hover: ${hoverColor};
  --color-primary-active: ${activeColor};
  --color-indigo-600: ${options.primaryColor};
  --color-indigo-500: ${hoverColor};
  --color-indigo-700: ${activeColor};
  --color-indigo-400: ${lightColor};
}
`;

  // Inject into admin/src/index.css and frontend/src/index.css
  const adminCssPath = path.join(options.targetDir, "admin", "src", "index.css");
  if (fs.existsSync(adminCssPath)) {
    const currentAdminCss = fs.readFileSync(adminCssPath, "utf-8");
    fs.writeFileSync(adminCssPath, currentAdminCss.replace('@import "tailwindcss";', `@import "tailwindcss";\n${tailwindThemeBlock}`));
  }

  const frontendCssPath = path.join(options.targetDir, "frontend", "src", "index.css");
  if (fs.existsSync(frontendCssPath)) {
    const currentFrontendCss = fs.readFileSync(frontendCssPath, "utf-8");
    fs.writeFileSync(frontendCssPath, currentFrontendCss.replace('@import "tailwindcss";', `@import "tailwindcss";\n${tailwindThemeBlock}`));
  }

  // Update HTML titles and theme-color meta tags
  const adminHtmlPath = path.join(options.targetDir, "admin", "index.html");
  if (fs.existsSync(adminHtmlPath)) {
    let adminHtml = fs.readFileSync(adminHtmlPath, "utf-8");
    adminHtml = adminHtml
      .replace(/<title>.*<\/title>/, `<title>${options.name} - Operations Admin</title>`)
      .replace(/<meta name="viewport"/, `<meta name="theme-color" content="${options.primaryColor}" />\n    <meta name="viewport"`);
    fs.writeFileSync(adminHtmlPath, adminHtml);
  }

  const frontendHtmlPath = path.join(options.targetDir, "frontend", "index.html");
  if (fs.existsSync(frontendHtmlPath)) {
    let frontendHtml = fs.readFileSync(frontendHtmlPath, "utf-8");
    frontendHtml = frontendHtml
      .replace(/<title>.*<\/title>/, `<title>${options.name}</title>`)
      .replace(/<meta name="viewport"/, `<meta name="theme-color" content="${options.primaryColor}" />\n    <meta name="viewport"`);
    fs.writeFileSync(frontendHtmlPath, frontendHtml);
  }

  // 3. Update Package JSONs
  console.log("📝 Customizing package manifests & project branding...");
  const rootPkgPath = path.join(options.targetDir, "package.json");
  if (fs.existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
    rootPkg.name = `${options.slug}-monorepo`;
    rootPkg.description = options.description;
    rootPkg.repository = {
      type: "git",
      url: options.githubRepo,
    };
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));
  }

  // 4. Generate Comprehensive .env
  console.log("🔑 Generating production-ready .env environment file...");
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  const orgSlug = slugify(options.orgName);

  const envContent = `# ==============================================================================
# ${options.name} - Environment Configuration
# Generated by QuickSaaS Installer on ${new Date().toISOString()}
# ==============================================================================

# Application Branding & Metadata
SITE_NAME="${options.name}"
SITE_SLUG="${options.slug}"
SITE_DESCRIPTION="${options.description}"
GITHUB_REPO="${options.githubRepo}"
PRIMARY_COLOR_HEX="${options.primaryColor}"

# HTTP Server Configuration
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
JWT_SECRET="${jwtSecret}"

# Database Configuration
# Leave DATABASE_URL empty to use Zero-Docker Embedded PostgreSQL (PGlite)
DATABASE_URL="${options.databaseUrl || ""}"

# Redis Cache & Queue Broker
# Leave REDIS_URL empty to use local/database queue polling fallback
REDIS_URL="${options.redisUrl || ""}"

# Storage Engine (Local Disk / EC2 EBS vs AWS S3 / MinIO)
STORAGE_DRIVER="${options.storageDriver}"
STORAGE_LOCAL_DIR="${options.storageLocalDir || "./storage"}"
S3_BUCKET="${options.s3Bucket || ""}"
S3_REGION="${options.s3Region || "us-east-1"}"
S3_ACCESS_KEY="${options.s3AccessKey || ""}"
S3_SECRET_KEY="${options.s3SecretKey || ""}"
S3_ENDPOINT="${options.s3Endpoint || ""}"

# Initial Superadmin & Organization Setup (Seeded on: npm run db:seed)
INITIAL_SUPERADMIN_NAME="${options.superadminName}"
INITIAL_SUPERADMIN_EMAIL="${options.superadminEmail}"
INITIAL_SUPERADMIN_PASSWORD="${options.superadminPassword}"
INITIAL_ORG_NAME="${options.orgName}"
INITIAL_ORG_SLUG="${orgSlug}"

# Third-Party Integrations (Optional)
STRIPE_SECRET_KEY="${options.stripeKey || ""}"
STRIPE_WEBHOOK_SECRET=""
RESEND_API_KEY="${options.emailApiKey || ""}"
`;
  fs.writeFileSync(path.join(options.targetDir, ".env"), envContent);

  // 5. Generate CI/CD Pipeline
  if (options.ciProvider === "github") {
    console.log("⚙️  Configuring GitHub Actions CI/CD workflow (.github/workflows/ci.yml)...");
    const githubWorkflowDir = path.join(options.targetDir, ".github", "workflows");
    fs.mkdirSync(githubWorkflowDir, { recursive: true });

    const githubWorkflow = `name: ${options.name} CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Build & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npm run build

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npm test

  e2e:
    name: Playwright Browser Journeys
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
`;
    fs.writeFileSync(path.join(githubWorkflowDir, "ci.yml"), githubWorkflow);
  } else if (options.ciProvider === "gitlab") {
    console.log("⚙️  Configuring GitLab CI/CD pipeline (.gitlab-ci.yml)...");
    const gitlabCi = `image: node:22-alpine

stages:
  - build
  - test

cache:
  key: \${CI_COMMIT_REF_SLUG}
  paths:
    - .npm/
    - node_modules/

before_script:
  - npm ci --cache .npm --prefer-offline

build:
  stage: build
  script:
    - npm run build

test:unit:
  stage: test
  script:
    - npm test
`;
    fs.writeFileSync(path.join(options.targetDir, ".gitlab-ci.yml"), gitlabCi);
  }

  // 6. Generate Template Manifest
  console.log(`⚡ Generating template blueprint (${options.template})...`);
  const saasManifest = {
    name: options.name,
    slug: options.slug,
    template: options.template,
    description: options.description,
    githubRepo: options.githubRepo,
    theme: {
      primaryColor: options.primaryColor,
      hoverColor,
      activeColor,
    },
    storage: {
      driver: options.storageDriver,
      localDir: options.storageLocalDir,
      s3Bucket: options.s3Bucket,
    },
    admin: {
      name: options.superadminName,
      email: options.superadminEmail,
    },
    ciProvider: options.ciProvider,
    generatedAt: new Date().toISOString(),
    kernelVersion: "1.0.0",
    resources: options.template === "feedback-hub" ? [
      {
        name: "FeedbackPost",
        slug: "feedback_posts",
        description: "Customer feature suggestions and bug reports",
        fields: [
          { name: "title", type: "text", required: true },
          { name: "description", type: "text", required: true },
          { name: "category", type: "text", required: true, defaultValue: "feature" },
          { name: "status", type: "text", required: true, defaultValue: "under_review" },
          { name: "upvotes", type: "number", required: true, defaultValue: 1 },
          { name: "submitterEmail", type: "text", required: true },
        ],
      },
      {
        name: "ProductRoadmap",
        slug: "roadmaps",
        description: "Public quarterly product release themes",
        fields: [
          { name: "quarter", type: "text", required: true },
          { name: "theme", type: "text", required: true },
          { name: "status", type: "text", required: true, defaultValue: "planned" },
          { name: "isPublic", type: "boolean", required: true, defaultValue: true },
        ],
      },
    ] : options.template === "crm" ? [
      {
        name: "CustomerDeal",
        slug: "deals",
        description: "Sales pipeline revenue deals",
        fields: [
          { name: "title", type: "text", required: true },
          { name: "amount", type: "number", required: true },
          { name: "stage", type: "text", required: true, defaultValue: "lead" },
          { name: "contactEmail", type: "text", required: true },
        ],
      },
    ] : [],
  };

  fs.writeFileSync(
    path.join(options.targetDir, "saas-manifest.json"),
    JSON.stringify(saasManifest, null, 2)
  );

  // 7. Ensure Local Storage Folder Exists if using local driver
  if (options.storageDriver === "local" && options.storageLocalDir) {
    const fullStoragePath = path.resolve(options.targetDir, options.storageLocalDir);
    if (!fs.existsSync(fullStoragePath)) {
      fs.mkdirSync(fullStoragePath, { recursive: true });
    }
  }

  // 8. Generate Custom README
  const readmeContent = `# ${options.name}

> ${options.description}  
> Repository: [${options.githubRepo}](${options.githubRepo})  
> Powered by **QuickSaaS** (Headless SaaS Kernel).

---

## 🎨 Theme & Brand Sync
- **Primary Brand Color**: \`${options.primaryColor}\` (Auto-synchronized with Tailwind CSS)
- **Hover / Accent**: \`${hoverColor}\`
- **Storage Driver**: \`${options.storageDriver.toUpperCase()}\` (${options.storageDriver === "s3" ? options.s3Bucket : options.storageLocalDir})

---

## 🚀 Quick Start

1. **Install Dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Initialize Database & Seed First Superadmin User**:
   \`\`\`bash
   npm run db:migrate
   npm run db:seed
   \`\`\`

3. **Start Development Stack**:
   \`\`\`bash
   npm run dev
   \`\`\`

---

### 🌐 Ports & Services
- **Backend API**: [http://localhost:4000](http://localhost:4000) (Swagger Docs at \`/documentation\`)
- **Operations Admin Portal**: [http://localhost:5173](http://localhost:5173)
- **Customer Workspace App**: [http://localhost:3001](http://localhost:3001)

---

### 🔑 Initial Pre-Configured Credentials
- **Superadmin**: \`${options.superadminEmail}\`
- **Password**: \`${options.superadminPassword}\`
- **Organization**: \`${options.orgName}\`

---

## 🔐 Admin Password Reset Utility
If you ever lose or need to reset the superadmin credentials, run:
\`\`\`bash
npm run admin:reset-password
\`\`\`
Or non-interactively:
\`\`\`bash
npm run admin:reset-password -- --email="${options.superadminEmail}" --password="NewPassword123!"
\`\`\`

---

## 📦 Dynamic Resources Available
${saasManifest.resources.length > 0 ? saasManifest.resources
  .map((r) => `- **${r.name}** (\`/api/v1/data/${r.slug}\`): ${r.description}`)
  .join("\n") : "- *Clean Canvas: Add resources in Admin API Studio*"}

---

## 🧪 Verification & Tooling
\`\`\`bash
npm test                     # Run all 70+ unit & integration tests
npm run test:e2e             # Run Playwright cross-app browser journeys
npm run build                # Production build
npm run backup               # Capture SHA256 disaster recovery snapshot
npm run restore              # Restore platform snapshot
npm run admin:reset-password # Reset superadmin password
\`\`\`
`;

  fs.writeFileSync(path.join(options.targetDir, "README.md"), readmeContent);

  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  🎉 ${options.name} Successfully Scaffolded!
├──────────────────────────────────────────────────────────────┤
│  📂 Destination  : ${options.targetDir.slice(0, 42).padEnd(42)} │
│  🎨 Brand Color  : ${options.primaryColor.padEnd(42)} │
│  👤 Superadmin   : ${options.superadminEmail.padEnd(42)} │
│  🔑 Password     : ${options.superadminPassword.padEnd(42)} │
│  📦 Storage      : ${(options.storageDriver === "s3" ? "AWS S3 / MinIO" : `Local (${options.storageLocalDir})`).padEnd(42)} │
├──────────────────────────────────────────────────────────────┤
│  👉 Next Steps to Run Your Application:                      │
│     1. cd ${options.targetDir}
│     2. npm install                                           │
│     3. npm run db:migrate && npm run db:seed                 │
│     4. npm run dev                                           │
│                                                              │
│  🔐 To reset admin password at any time:                     │
│     npm run admin:reset-password                             │
└──────────────────────────────────────────────────────────────┘
`);
}

async function main() {
  const cliOptions = parseCliArgs();

  if (cliOptions.nonInteractive || process.argv.includes("--yes") || process.argv.includes("-y")) {
    await createSaas(cliOptions);
  } else {
    const answers = await promptInstaller(cliOptions);
    await createSaas(answers);
  }
}

if (process.argv[1]?.endsWith("create-saas.ts")) {
  main().catch((err) => {
    console.error("❌ Scaffolder failed:", err);
    process.exit(1);
  });
}
