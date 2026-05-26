# Phase 3 — Environment Variables

Set all environment variables in the Vercel dashboard. Never commit secrets to the repository — all sensitive values go through Vercel's environment variable manager.

---

## How to Set Variables

**Via Vercel Dashboard (recommended for setup):**

1. Go to Vercel Dashboard → `sunbites-pos` → **Settings** → **Environment Variables**
2. For each variable: enter the **Key**, **Value**, and select the target **Environment(s)**
3. Click **Save**
4. Redeploy for changes to take effect

**Via Vercel CLI:**

```bash
# Add a variable to preview (staging)
vercel env add NEXT_PUBLIC_API_URL preview

# Add a variable to production
vercel env add NEXT_PUBLIC_API_URL production

# List all variables
vercel env ls
```

---

## Staging Variables

Set these under the **Preview** environment in Vercel.

```env
NEXT_PUBLIC_API_URL=https://api-staging.sunbites.com.ph/api/v1
```

---

## Production Variables

Set these under the **Production** environment in Vercel.

```env
NEXT_PUBLIC_API_URL=https://api.sunbites.com.ph/api/v1
```

---

## Key Differences Between Environments

| Variable               | Staging                                          | Production                              |
|------------------------|--------------------------------------------------|-----------------------------------------|
| `NEXT_PUBLIC_API_URL`  | `https://api-staging.sunbites.com.ph/api/v1`     | `https://api.sunbites.com.ph/api/v1`    |

---

## Security Rules

- **Never** put secrets (API keys, tokens) in `NEXT_PUBLIC_` variables — these are embedded in the browser bundle and visible to anyone
- The POS app authenticates via Sanctum Bearer tokens issued by the Laravel API — no OAuth secrets belong here
- All sensitive values (if any are added in future) go in non-prefixed env vars and are only available server-side (Server Components, Route Handlers, Server Actions)

---

## Local Development

Pull the preview environment variables to your local `.env.local`:

```bash
vercel env pull .env.local
```

Or copy `.env.example` and set `NEXT_PUBLIC_API_URL` to your local API URL:

```bash
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://api.sunbites.test/api/v1
```

---

## Phase 3 Checklist

- [ ] Staging `NEXT_PUBLIC_API_URL` set to `https://api-staging.sunbites.com.ph/api/v1` (Preview environment)
- [ ] Production `NEXT_PUBLIC_API_URL` set to `https://api.sunbites.com.ph/api/v1` (Production environment)
- [ ] Variables verified — trigger a staging deployment and confirm API requests go to the correct URL

---

**Next:** [04-cicd.md](04-cicd.md) — GitHub Actions CI/CD workflows
