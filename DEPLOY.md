# Deploying VOUCH ($0, no credit card)

## Prerequisites — all free

| Tool | Why | Get it |
|---|---|---|
| GitHub account | hosts the private repo | github.com |
| `gh` CLI, authenticated | push repo via CLI | `winget install GitHub.cli`, then `gh auth login` |
| Render account | hosts the FastAPI backend | render.com (no card on free plan) |
| Vercel account | hosts the Next.js frontend | vercel.com (no card on Hobby plan) |
| GitHub PAT (optional, recommended) | raises GitHub API rate limit 60/hr → 5000/hr | GitHub → Settings → Developer settings → Fine-grained tokens → read-only, public repos |
| Groq API key (optional) | enables AI prose in /api/recommend | console.groq.com → free tier, no card |

---

## Step 1 — Push to a private GitHub repo

```bash
cd D:\vouch
gh repo create vouch --private --source=. --remote=origin --push
```

Verify: go to github.com/<your-username>/vouch — it should show 🔒 Private.

---

## Step 2 — Deploy backend on Render

**Option A — Blueprint (recommended, one click):**
1. Render dashboard → New → Blueprint.
2. Connect your GitHub account, select the `vouch` repo.
3. Render finds `render.yaml` automatically and creates the `vouch-api` service.
4. Click **Apply**.

**Option B — Manual web service:**
1. Render → New → Web Service.
2. Connect repo → select `vouch`.
3. Settings:
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -e .`
   - Start Command: `python -m app.main`
   - Plan: **Free**
   - Health Check Path: `/api/health`
4. Click Create Web Service.

**Set environment variables** (in the Render service → Environment tab):

| Key | Value |
|---|---|
| `VOUCH_GITHUB_TOKEN` | your free PAT (recommended) |
| `VOUCH_LLM_API_KEY` | your free Groq key (optional) |
| `VOUCH_CORS_ORIGINS` | _set in Step 4_ |

**Wait for deploy to finish.** URL will be: `https://vouch-api.onrender.com`
(or similar — note the exact URL for Step 3).

**Verify:** `curl https://vouch-api.onrender.com/api/health`
Expected: `{"status":"ok","service":"vouch-backend"}`

---

## Step 3 — Deploy frontend on Vercel

1. Vercel → Add New → Project.
2. Import Git Repository → select `vouch`.
3. **Root Directory:** `frontend` ← critical, must be set.
4. Framework: Next.js (auto-detected).
5. Environment Variables (Production + Preview scope):
   - `NEXT_PUBLIC_API_BASE` = `https://vouch-api.onrender.com` (your Render URL)
   - `NEXT_PUBLIC_SITE_URL` = `https://vouch.vercel.app` (your Vercel URL, set before deploying if known; update after if not)
6. Click **Deploy**.

**Wait for build.** Vercel builds Next.js; build log should show `Compiled successfully`.
URL will be: `https://vouch.vercel.app` (or your chosen name).

---

## Step 4 — Wire CORS

Now that you have the Vercel URL, go back to Render:
- Environment → add/update `VOUCH_CORS_ORIGINS` = `https://vouch.vercel.app`
- Click **Save Changes** → Render auto-redeploys the backend.

If you have multiple Vercel preview URLs you want to allow, comma-separate them:
`https://vouch.vercel.app,https://vouch-git-main-yourname.vercel.app`

---

## Step 5 — Smoke test (live)

Run these checks. First request to Render may be slow (cold start ~30-60s on free tier — expected).

```bash
# Backend health
curl https://vouch-api.onrender.com/api/health
# → {"status":"ok","service":"vouch-backend"}

# Search (real GitHub data)
curl "https://vouch-api.onrender.com/api/search?q=markdown+editor&limit=3"
# → {"ok":true,"top":[...],"considered":...}

# Frontend landing (should return HTML with "Find open-source tools")
curl -s https://vouch.vercel.app | grep -o "Find open-source tools you can trust"
# → Find open-source tools you can trust

# SEO comparison page (SSR from live data; may be slow first hit)
curl -s https://vouch.vercel.app/vs/tauri-vs-electron | grep -oE "tauri-apps/tauri|Trust score|application/ld.json" | sort -u
# → application/ld+json  Trust score  tauri-apps/tauri

# Sitemap
curl -s https://vouch.vercel.app/sitemap.xml | grep -o "/vs/tauri-vs-electron"
# → /vs/tauri-vs-electron
```

If any check fails, see the Troubleshooting section below.

---

## Step 6 — Optional: keep Render warm (prevents cold starts)

Render's free tier spins down after ~15 min idle. A free cron pinger prevents this:

1. Go to [cron-job.org](https://cron-job.org) (free, no card).
2. Create a cron job: URL = `https://vouch-api.onrender.com/api/health`, interval = every 10 minutes.
3. Done. The first request to your site will no longer cold-start.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend search returns CORS error in browser console | `VOUCH_CORS_ORIGINS` on Render not set to Vercel URL | Step 4 — set and redeploy backend |
| `/vs/tauri-vs-electron` shows "Not found" | Backend cold start timeout (free tier) | Retry after 60s; add keep-warm (Step 6) |
| `curl /api/search` returns 429 | GitHub rate limit, no PAT set | Add `VOUCH_GITHUB_TOKEN` (free PAT) on Render |
| Vercel build fails | Wrong Root Directory | Ensure Root Directory = `frontend` in Vercel project settings |
| Backend deploy fails on Render | Build command issue | Check Render build logs; confirm `rootDir: backend` in render.yaml |
| AI recommend shows "Heuristic ranking" | No LLM key (expected — product works fine) | Optional: add `VOUCH_LLM_API_KEY` (free Groq key) on Render |

---

## After deploy — update README

Edit `README.md` at the repo root: replace `_set after deploy_` under **Live** with the real Vercel URL. Push. Vercel redeploys automatically.
