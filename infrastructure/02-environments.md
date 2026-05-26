# Phase 2 — Environments

Vercel has three built-in environments: **Production**, **Preview**, and **Development**. We map them to our two deployable environments as follows:

| Our Environment | Vercel Environment | Trigger                     | Domain                               |
|-----------------|--------------------|-----------------------------|--------------------------------------|
| Staging         | Preview            | Push to `staging` branch    | `staging-pos.sunbites.com.ph`        |
| Production      | Production         | Manual `workflow_dispatch`  | `pos.sunbites.com.ph`                |

---

## 2.1 How Vercel Environments Work

- **Production** — created when you deploy with `vercel deploy --prod`. This is the canonical live deployment.
- **Preview** — created for every non-production deployment. We use this for staging by always deploying the `staging` branch here and assigning it a fixed custom domain.
- **Development** — only used locally with `vercel env pull`.

Environment variables in the Vercel dashboard are scoped to one or more of these environments. Always set staging vars under **Preview** and production vars under **Production**.

---

## 2.2 Set Up the Staging Domain

1. Go to Vercel Dashboard → `sunbites-pos` → **Settings** → **Domains**
2. Add domain: `staging-pos.sunbites.com.ph`
3. Set **Git Branch** for this domain to `staging`
4. Add the DNS records Vercel provides to your DNS provider (Cloudflare, etc.)

This means every deployment of the `staging` branch is accessible at `staging-pos.sunbites.com.ph`.

---

## 2.3 Set Up the Production Domain

1. Go to Vercel Dashboard → `sunbites-pos` → **Settings** → **Domains**
2. Add domain: `pos.sunbites.com.ph`
3. Leave **Git Branch** as the default (Production)
4. Add the DNS records Vercel provides to your DNS provider

---

## 2.4 Configure GitHub Environments (for CI approval gate)

Go to the `sunbites-pos` GitHub repo → **Settings** → **Environments** → **New environment**

Create two environments:

**`staging`**
- No required reviewers needed (auto-deploy)
- Restrict to `staging` branch only

**`production`**
- Enable **Required reviewers** — add yourself (or a lead)
- Restrict to `main` branch only
- Enable **Prevent self-review** if a second reviewer is available

These environments are referenced by the GitHub Actions workflows using `environment: staging` and `environment: production`.

---

## 2.5 Key Differences Between Environments

| Setting                  | Staging                               | Production                    |
|--------------------------|---------------------------------------|-------------------------------|
| Vercel environment       | Preview                               | Production                    |
| Deploy flag              | `vercel deploy`                       | `vercel deploy --prod`        |
| API URL                  | `https://api-staging.sunbites.com.ph` | `https://api.sunbites.com.ph` |
| Domain                   | `staging-pos.sunbites.com.ph`         | `pos.sunbites.com.ph`         |
| Deploy trigger           | Auto (push to `staging`)              | Manual (`workflow_dispatch`)  |
| GitHub env approval gate | No                                    | Yes                           |

---

## Phase 2 Checklist

- [ ] `staging-pos.sunbites.com.ph` domain added to Vercel and DNS configured
- [ ] `pos.sunbites.com.ph` domain added to Vercel and DNS configured
- [ ] Staging domain linked to `staging` branch in Vercel
- [ ] GitHub `staging` environment created, restricted to `staging` branch
- [ ] GitHub `production` environment created with required reviewers, restricted to `main`

---

**Next:** [03-environment-variables.md](03-environment-variables.md) — Set environment variables
