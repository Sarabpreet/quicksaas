# GitHub Actions CI Recipe

If you use GitHub, you can add automated quality gates to your repository by copying the workflow below into `.github/workflows/ci.yml`.

---

## 📋 Drop-In Workflow: `.github/workflows/ci.yml`

Create the file `.github/workflows/ci.yml` in your repository:

```yaml
name: QuickSaaS CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # 1. Typecheck & Production Build
  build:
    name: Build & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Verify Builds (TypeScript & Vite)
        run: npm run build

  # 2. Unit & Integration Tests (Matrix parallelization)
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Run Backend & Frontend Suites (68 Tests)
        run: npm test

  # 3. Playwright Multi-App Browser E2E Journeys
  e2e:
    name: Playwright E2E Journeys
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Run Multi-App Browser Journeys
        run: npm run test:e2e
```

---

## ⚡ What this Workflow Does
1. **Parallel Execution**: `build` and `test` run concurrently on clean Ubuntu runners.
2. **Dependency Caching**: Caches `npm` modules across runs for sub-minute install times.
3. **Cancellation on New Pushes**: Automatically cancels outdated in-progress runs when you push new commits to an open PR.
4. **Browser E2E**: Installs Chromium dependencies and executes cross-app journeys spanning backend, admin, and frontend.
