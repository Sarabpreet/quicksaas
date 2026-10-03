# GitLab CI/CD Recipe

If you use GitLab, you can drop the configuration below into `.gitlab-ci.yml` in the root of your repository.

---

## 📋 Drop-In Configuration: `.gitlab-ci.yml`

Create `.gitlab-ci.yml`:

```yaml
image: node:22-alpine

stages:
  - build
  - test

# Cache dependencies across pipeline stages
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .npm/
    - node_modules/

before_script:
  - npm ci --cache .npm --prefer-offline

# Stage 1: Build & Typecheck
build:
  stage: build
  script:
    - npm run build

# Stage 2: Unit & Integration Tests (68 Tests)
test:unit:
  stage: test
  script:
    - npm test

# Optional: Playwright E2E in official container
test:e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.50.0-noble
  script:
    - npm ci
    - npm run test:e2e
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```
