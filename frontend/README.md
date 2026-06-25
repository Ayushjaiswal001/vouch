# VOUCH frontend

Next.js (App Router) UI for the VOUCH discovery engine.

## Run
    npm install
    cp .env.local.example .env.local   # optional; defaults to http://127.0.0.1:8000
    npm run dev                         # http://localhost:3000

The backend must be running (see ../backend/README.md).

## Routes
- `/`                      landing with two modes: live Search and Ask AI (recommend & compare)
- `/repo/{owner}/{name}`   repo detail + trust scorecard + OSSF checks
- `/compare?repos=a/b,c/d` side-by-side comparison
- `/vs`                    index of curated open-source comparisons
- `/vs/{slug}`             SEO comparison page (e.g. /vs/tauri-vs-electron), ISR-cached
- `/sitemap.xml`, `/robots.txt`  generated from the comparisons registry

## Checks
    npm run test -- --run
    npm run typecheck
    npm run build

## Deploy (Vercel — free)

1. Go to vercel.com → New Project → Import the private GitHub repo.
2. **Root Directory:** `frontend` (required — Vercel auto-detects Next.js from here).
3. **Environment Variables (Production + Preview):**
   - `NEXT_PUBLIC_API_BASE` = the Render backend URL (e.g. `https://vouch-api.onrender.com`)
   - `NEXT_PUBLIC_SITE_URL` = the Vercel project URL (e.g. `https://vouch.vercel.app`)
4. Click **Deploy**.
5. After the first deploy succeeds, add your Vercel URL to the Render service's
   `VOUCH_CORS_ORIGINS` env var, then redeploy the backend.
