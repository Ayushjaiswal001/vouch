# VOUCH — 90-Day Sprint to Accelerator-Ready (#1: Accel Atoms)

**Date:** 2026-06-21
**Goal:** Hit the readiness bar for an **Accel Atoms** application — a live product, a credible India-dev traction signal, and a tight velocity-and-wedge story — working backward from the application.

> Anchored on Accel Atoms (see [accelerator-tracker.md](accelerator-tracker.md)). NSRCEL + Google for Startups India (both equity-free) are filed in parallel because they cost almost nothing.

---

## The bar we're working backward from

An Atoms reviewer should, in 5 minutes, see: **(1)** a working product they can try, **(2)** evidence real developers use it, **(3)** a one-sentence wedge that isn't "search GitHub better," and **(4)** a founder shipping fast. Everything below ladders up to those four.

---

## Phase 1 — Ship & instrument (Days 0–30)

**Theme: it's live, and we can measure it.**

- [ ] Execute **Plan 5 (deploy)** — frontend on Vercel, backend on Render free tier, repo private. Public URL anyone can hit. *(blocks everything else)*
- [ ] Add free privacy-friendly analytics (Plausible self-host / Umami / Vercel Web Analytics free) — track: searches run, `/vs` page views, AI-recommend uses, return visits.
- [ ] Wire a free **GitHub PAT** on the backend so live demos don't throttle (now honoured via `VOUCH_GITHUB_TOKEN`).
- [ ] Ship 8–12 high-intent **`/vs` comparison pages** targeting India-dev search terms; submit `sitemap.xml` to Google Search Console (free) → start the SEO compounding clock early.
- [ ] Register **Startup India / DPIIT** (free) — unlocks recognition several programs ask for.
- [ ] Define the **India ICP** in one paragraph (e.g., "Indian startup/SME backend & full-stack devs choosing self-hostable OSS to avoid USD SaaS bills").

**Exit criteria:** product is live; analytics flowing; 10+ `/vs` pages indexed; ICP written.

## Phase 2 — Traction & wedge (Days 31–60)

**Theme: real India developers use it, and the wedge is sharp.**

- [ ] Get **20–50 India devs** to actually use VOUCH. Channels (India distribution):
  - Post in India dev communities: r/developersIndia, relevant Discords/Telegrams, college dev clubs (start with Sir MVIT + Bangalore college networks), LinkedIn India tech.
  - Publish 2–3 short "X vs Y for Indian startups" posts linking to `/vs` pages.
  - DM 10–15 devs at India startups; offer VOUCH as a free pick-the-right-OSS helper; convert 3–5 to **design partners**.
- [ ] Sharpen the **wedge** beyond "better GitHub search": e.g. *"the trust + AI layer that tells Indian teams which OSS is safe, maintained, and cheap to self-host — before they bet a product on it."*
- [ ] Add **India-relevant signal** where it differentiates: highlight self-hostable / no-USD-SaaS angle in results (cost-to-run matters more in INR budgets than in the US).
- [ ] **Monetization sketch (not building yet):** note the path — team alerts/audits priced in INR via **Razorpay/UPI** (India payment rails) when accounts land post-v1. One slide, not code.

**Exit criteria:** 20–50 used it; ≥3 design partners or repeat users; a wedge sentence you can say in one breath; a weekly-usage line trending up.

## Phase 3 — Package & apply (Days 61–90)

**Theme: tell the velocity story and hit submit.**

- [ ] **60-second demo video** — search → trust scorecard → AI compare → `/vs` page. No slides, just the product working.
- [ ] **5–8 slide narrative** tuned for India reviewers: problem → wedge → live product → traction trend → why-now → why-me. *Velocity and the defensible wedge lead; market-size slide is one line, not the pitch.*
- [ ] **Founder story** (½ page): Bangalore CS student, built the `find-oss` engine solo, shipped VOUCH end-to-end, here's the weekly shipping cadence.
- [ ] Decide the **co-founder question** and state your answer (solo-with-plan, or recruiting).
- [ ] **Submit Accel Atoms** application. File **NSRCEL** + **Google for Startups India** the same week (parallel, equity-free).
- [ ] Prep a 2-page **Surge** teaser to fire the moment traction crosses their bar (post-90).

**Exit criteria:** Atoms application submitted; 2 parallel equity-free applications filed; demo + deck + founder story reusable for any program.

---

## Weekly cadence (keeps the velocity story true)
- Ship something user-visible every week (new `/vs` pages, AI quality, UX).
- Log one metric line weekly: searches, `/vs` views, AI uses, return visitors.
- Talk to ≥2 India devs/week; write down what they say.

## Honest risk flags
- **Traction is the gating risk**, not the product — the build is ahead of the demand. Phase 2 is the real work.
- **Solo + first-year student** is a real question for these programs; have a crisp answer, don't dodge it.
- Don't over-build features for the pitch; **distribution + the wedge** move the needle now, not more code.
