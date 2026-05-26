# Phase 4 — GitHub Actions CI/CD

Two workflows:

| Workflow   | File                                  | Trigger                  | Target      |
|------------|---------------------------------------|--------------------------|-------------|
| Staging    | `.github/workflows/staging.yml`       | Push to `staging` branch | Staging (Preview) environment |
| Production | `.github/workflows/production.yml`    | Manual (`workflow_dispatch`) | Production environment |

Both workflows run quality checks (type-check + lint + tests) before deploying. Production requires a manual trigger and reviewer approval via a GitHub environment gate.

---

## 4.1 Required GitHub Secrets

Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret              | Value                                               | Where to get it                                           |
|---------------------|-----------------------------------------------------|-----------------------------------------------------------|
| `VERCEL_TOKEN`      | Vercel API token                                    | vercel.com/account/tokens → Create Token                  |
| `VERCEL_ORG_ID`     | Vercel team/org ID                                  | `.vercel/project.json` → `orgId` after `vercel link`      |
| `VERCEL_PROJECT_ID` | Vercel project ID                                   | `.vercel/project.json` → `projectId` after `vercel link`  |

All three secrets are required for both workflows.

---

## 4.2 Collect Vercel Identifiers

```bash
# In the sunbites-pos root directory
npm i -g vercel
vercel link           # authenticate and link to the Vercel project

cat .vercel/project.json
# → { "orgId": "team_xxx", "projectId": "prj_xxx" }
```

Add `orgId` as `VERCEL_ORG_ID` and `projectId` as `VERCEL_PROJECT_ID` in GitHub Secrets.

---

## 4.3 Staging Workflow

**File:** `.github/workflows/staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - staging

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test -- --ci --passWithNoTests

  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: quality
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel environment info
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Vercel (staging)
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 4.4 Production Workflow

**File:** `.github/workflows/production.yml`

Production is **never** triggered automatically. Only a manual `workflow_dispatch` deploys to production.

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type DEPLOY to confirm production deployment'
        required: true
        default: ''

jobs:
  validate:
    name: Validate Confirmation
    runs-on: ubuntu-latest

    steps:
      - name: Check confirmation input
        run: |
          if [ "${{ github.event.inputs.confirm }}" != "DEPLOY" ]; then
            echo "Confirmation failed. Type DEPLOY to proceed."
            exit 1
          fi

  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    needs: validate

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test -- --ci --passWithNoTests

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: quality
    environment: production        # requires GitHub environment protection rules

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel environment info
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Vercel (production)
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 4.5 GitHub Environment Protection (Production)

The production workflow uses `environment: production` which allows GitHub to enforce approval gates.

Set this up at GitHub repo → **Settings** → **Environments** → `production`:

- Enable **Required reviewers** — add yourself (or a lead)
- Restrict to **`main` branch only** — prevents deploying from feature branches
- Enable **Prevent self-review** if you want a second set of eyes

With this in place, even if someone triggers `workflow_dispatch`, the deploy job pauses for reviewer approval before running.

---

## 4.6 Branch Strategy

```
main ─────────────────────────────────────── Production (manual deploy)
  │
  └── staging ────────────────────────────── Staging (auto-deploy on push)
        │
        └── feat/your-feature ─────────────── Development (no deploy)
```

**Flow:**
1. Developer creates `feat/` branch from `staging`
2. PR merged into `staging` → quality checks run → auto-deploys to `staging-pos.sunbites.com.ph`
3. After staging is verified → PR from `staging` into `main`
4. Go to GitHub Actions → **Deploy to Production** → **Run workflow** → type `DEPLOY` → reviewer approves

---

## 4.7 Verify Workflows

After adding both workflow files, push to `staging` and confirm:

1. Quality checks pass (type-check, lint, tests)
2. Vercel deployment step outputs a URL
3. `https://staging-pos.sunbites.com.ph` loads the app and API calls reach `api-staging.sunbites.com.ph`

For production:

1. Go to GitHub → Actions → **Deploy to Production** → **Run workflow**
2. Enter `DEPLOY` in the confirmation field
3. Approve the environment gate
4. Confirm `https://pos.sunbites.com.ph` is live

---

## Phase 4 Checklist

- [ ] `VERCEL_TOKEN` added to GitHub repository secrets
- [ ] `VERCEL_ORG_ID` added to GitHub repository secrets
- [ ] `VERCEL_PROJECT_ID` added to GitHub repository secrets
- [ ] `.github/workflows/staging.yml` created and committed
- [ ] `.github/workflows/production.yml` created and committed
- [ ] GitHub `staging` environment created, restricted to `staging` branch
- [ ] GitHub `production` environment created with required reviewers, restricted to `main`
- [ ] Staging workflow triggered and succeeded on first push to `staging`
- [ ] Production workflow tested with `workflow_dispatch`
