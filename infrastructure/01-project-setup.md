# Phase 1 — Project Setup on Vercel

Create and connect the Vercel project so deployments can be triggered from GitHub.

---

## 1.1 Prerequisites

- Vercel account at [vercel.com](https://vercel.com)
- GitHub repository for `sunbites-pos`
- Vercel CLI installed locally: `npm i -g vercel`

---

## 1.2 Create the Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → select `sunbites-pos`
3. **Framework Preset**: Next.js (auto-detected)
4. **Root Directory**: leave as `/` (the repo root is the Next.js app)
5. **Build Command**: `npm run build`
6. **Output Directory**: `.next` (auto-detected by Vercel)
7. **Install Command**: `npm ci`
8. Click **Deploy** — this creates the project and runs the first deployment

---

## 1.3 Collect Project Identifiers

After the project is created, you need three identifiers for CI/CD secrets.

**Option A — Vercel CLI (recommended)**

```bash
# In the sunbites-pos directory
vercel link

# Then inspect the linked project
cat .vercel/project.json
```

This outputs:
```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

**Option B — Vercel Dashboard**

- `VERCEL_ORG_ID`: Team Settings → General → Team ID
- `VERCEL_PROJECT_ID`: Project → Settings → General → Project ID

---

## 1.4 Create a Vercel API Token

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name: `sunbites-pos-github-actions`
4. Scope: **Full Account** (or restrict to the team if using a Vercel team)
5. Expiration: No expiry (or set a long expiry and rotate annually)
6. Copy the token — it is only shown once

---

## 1.5 Add GitHub Secrets

Go to the `sunbites-pos` GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret              | Value                                          |
|---------------------|------------------------------------------------|
| `VERCEL_TOKEN`      | Token from step 1.4                            |
| `VERCEL_ORG_ID`     | `orgId` from `.vercel/project.json`            |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json`        |

---

## 1.6 Commit the `.vercel/` directory (optional but recommended for CI)

The `.vercel/project.json` file is not sensitive — it only contains the project and org IDs (the token is the secret). Committing it avoids having to re-link in CI.

If you prefer not to commit it, the CI workflow uses `vercel link` at runtime using the secrets instead.

> The workflows in this repo use the `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` secrets directly, so committing `.vercel/project.json` is optional.

---

## Phase 1 Checklist

- [ ] Vercel project created and named `sunbites-pos`
- [ ] First deployment succeeded from Vercel dashboard
- [ ] `VERCEL_TOKEN` added to GitHub repository secrets
- [ ] `VERCEL_ORG_ID` added to GitHub repository secrets
- [ ] `VERCEL_PROJECT_ID` added to GitHub repository secrets

---

**Next:** [02-environments.md](02-environments.md) — Configure staging and production environments
