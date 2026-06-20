# VOUCH SEO Comparison Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-rendered SEO comparison pages at `/vs/[slug]` (e.g. `/vs/tauri-vs-electron`) generated from a curated registry and the live trust data, plus a `/vs` index, `sitemap.xml`, `robots.txt`, JSON-LD structured data, and rich metadata — the organic-growth surface for VOUCH.

**Architecture:** A curated, typed registry (`frontend/lib/comparisons.ts`) maps clean slugs to two repo full-names + copy. The `/vs/[slug]` route is a server component that fetches both repos via the existing `fetchRepo` (backend `/api/repo`), renders a `VsComparison` component, emits JSON-LD, and sets per-page metadata. Pages use **ISR with on-demand generation** (`generateStaticParams` returns `[]`, `revalidate` daily) so the production build never needs the backend, yet crawlers receive cached server-rendered HTML. `sitemap.ts`/`robots.ts` advertise the curated set.

**Tech Stack:** Next.js 16 App Router (Metadata API, `MetadataRoute.Sitemap`/`Robots`, ISR), React 19, Tailwind v4, Vitest. No backend changes. No new dependencies. **$0.**

**Reused frontend surfaces (already built):**
- `lib/api.ts`: `fetchRepo(owner, name) → RepoResult | null`, type `RepoResult` with `scores{total,safety,popularity,maintenance,pc_fit}`, `stars`, `license`, `language`, `full_name`, `html_url`, `description`.
- `components/Stars`, `components/ScoreBar` exist (reusable).
- `lib/format.ts`: `formatStars`.

**Next.js 16 notes (see `frontend/AGENTS.md`):** `params`/`searchParams` are Promises (`await params`). `generateMetadata` is async and receives the same `{ params }`. `sitemap.ts`/`robots.ts` live in `app/`. `revalidate`/`dynamicParams` are route segment config exports.

---

## File Structure

```
vouch/frontend/
  lib/
    comparisons.ts                 # NEW — curated registry + getComparison()
    __tests__/comparisons.test.ts  # NEW
  components/
    VsComparison.tsx               # NEW — two-repo side-by-side with winner highlight + verdict
    __tests__/VsComparison.test.tsx# NEW
  app/
    vs/
      page.tsx                     # NEW — /vs index (lists curated comparisons)
      [slug]/page.tsx              # NEW — /vs/[slug] SEO comparison page (ISR)
    sitemap.ts                     # NEW
    robots.ts                      # NEW
    page.tsx                       # MODIFY — add "Popular comparisons" links
  .env.local.example               # MODIFY — add NEXT_PUBLIC_SITE_URL
  README.md                        # MODIFY — document /vs + sitemap
```

**Responsibilities:**
- `lib/comparisons.ts` — pure data + lookup; the single source of truth for which comparisons exist.
- `components/VsComparison.tsx` — pure presentational; given two `RepoResult`, renders the comparison and a verdict. No fetching.
- `app/vs/[slug]/page.tsx` — routing + data fetch + metadata + JSON-LD composition only.
- `sitemap.ts`/`robots.ts` — crawl directives derived from the registry.

---

## Task 1: Curated comparisons registry

**Files:**
- Create: `frontend/lib/comparisons.ts`
- Test: `frontend/lib/__tests__/comparisons.test.ts`

- [ ] **Step 1: Create `frontend/lib/comparisons.ts`**

```ts
export interface Comparison {
  slug: string; // "tauri-vs-electron"
  title: string; // "Tauri vs Electron"
  category: string; // human label, e.g. "desktop app frameworks"
  a: string; // repo full_name, e.g. "tauri-apps/tauri"
  b: string; // repo full_name
  blurb: string; // 1-2 sentence intro
}

export const COMPARISONS: Comparison[] = [
  {
    slug: "tauri-vs-electron",
    title: "Tauri vs Electron",
    category: "desktop app frameworks",
    a: "tauri-apps/tauri",
    b: "electron/electron",
    blurb:
      "Both let you ship desktop apps with web tech, but they trade off bundle size, memory, and ecosystem maturity very differently.",
  },
  {
    slug: "vite-vs-webpack",
    title: "Vite vs Webpack",
    category: "JavaScript build tools",
    a: "vitejs/vite",
    b: "webpack/webpack",
    blurb:
      "The modern dev-server-first bundler versus the battle-tested incumbent that powers a huge share of production builds.",
  },
  {
    slug: "bun-vs-deno",
    title: "Bun vs Deno",
    category: "JavaScript runtimes",
    a: "oven-sh/bun",
    b: "denoland/deno",
    blurb:
      "Two ambitious Node alternatives with different bets on speed, compatibility, and a batteries-included toolchain.",
  },
  {
    slug: "svelte-vs-react",
    title: "Svelte vs React",
    category: "frontend frameworks",
    a: "sveltejs/svelte",
    b: "facebook/react",
    blurb:
      "A compiler-first framework with minimal runtime versus the dominant library with the largest ecosystem.",
  },
  {
    slug: "fastapi-vs-flask",
    title: "FastAPI vs Flask",
    category: "Python web frameworks",
    a: "fastapi/fastapi",
    b: "pallets/flask",
    blurb:
      "Modern async-first APIs with typed validation versus the minimal, endlessly flexible classic microframework.",
  },
  {
    slug: "pnpm-vs-npm",
    title: "pnpm vs npm",
    category: "JavaScript package managers",
    a: "pnpm/pnpm",
    b: "npm/cli",
    blurb:
      "A fast, disk-efficient package manager with strict resolution versus the default that ships with Node.",
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
```

- [ ] **Step 2: Write the failing test `frontend/lib/__tests__/comparisons.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { COMPARISONS, getComparison } from "@/lib/comparisons";

describe("comparisons registry", () => {
  it("looks up by slug", () => {
    const c = getComparison("tauri-vs-electron");
    expect(c?.a).toBe("tauri-apps/tauri");
    expect(c?.b).toBe("electron/electron");
  });

  it("returns undefined for unknown slug", () => {
    expect(getComparison("nope-vs-nada")).toBeUndefined();
  });

  it("every entry is well-formed (slug pattern, two owner/name repos)", () => {
    for (const c of COMPARISONS) {
      expect(c.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-vs-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(c.a).toMatch(/^[^/]+\/[^/]+$/);
      expect(c.b).toMatch(/^[^/]+\/[^/]+$/);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
  });

  it("slugs are unique", () => {
    const slugs = COMPARISONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
```

- [ ] **Step 3: Run to verify**

Run: `cd frontend && npm run test -- --run lib/__tests__/comparisons.test.ts`
Expected: PASS (4 tests). Then `npm run typecheck` — clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/comparisons.ts frontend/lib/__tests__/comparisons.test.ts
git commit -m "feat(frontend): curated comparisons registry"
```

---

## Task 2: VsComparison component

**Files:**
- Create: `frontend/components/VsComparison.tsx`
- Test: `frontend/components/__tests__/VsComparison.test.tsx`

- [ ] **Step 1: Create `frontend/components/VsComparison.tsx`**

```tsx
import type { RepoResult } from "@/lib/api";
import { formatStars } from "@/lib/format";
import Link from "next/link";

type Metric = { label: string; get: (r: RepoResult) => number; pct: boolean };

const METRICS: Metric[] = [
  { label: "Trust score", get: (r) => r.scores.total, pct: true },
  { label: "Safety", get: (r) => r.scores.safety, pct: true },
  { label: "Popularity", get: (r) => r.scores.popularity, pct: true },
  { label: "Maintenance", get: (r) => r.scores.maintenance, pct: true },
  { label: "Lightweight", get: (r) => r.scores.pc_fit, pct: true },
];

function detailHref(fullName: string): string {
  const [owner, name] = fullName.split("/");
  return `/repo/${owner}/${name}`;
}

export default function VsComparison({ a, b }: { a: RepoResult; b: RepoResult }) {
  const winner =
    a.scores.total === b.scores.total
      ? null
      : a.scores.total > b.scores.total
        ? a
        : b;

  function cell(r: RepoResult, m: Metric) {
    const other = r === a ? b : a;
    const isHigher = m.get(r) > m.get(other);
    const val = m.pct ? Math.round(m.get(r) * 100) : m.get(r);
    return (
      <td
        className={`p-3 tabular-nums ${isHigher ? "font-bold text-green-700" : "text-gray-700"}`}
        data-higher={isHigher ? "true" : "false"}
      >
        {val}
        {isHigher && <span aria-hidden> ✓</span>}
      </td>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left font-medium text-gray-500">Metric</th>
              {[a, b].map((r) => (
                <th key={r.full_name} className="p-3 text-left">
                  <Link href={detailHref(r.full_name)} className="font-semibold hover:underline">
                    {r.full_name}
                  </Link>
                  <div className="text-xs font-normal text-gray-500">
                    ★ {formatStars(r.stars)} · {r.license} · {r.language || "—"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.label} className="border-b border-gray-100 last:border-0">
                <td className="p-3 text-gray-500">{m.label}</td>
                {cell(a, m)}
                {cell(b, m)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rounded-md bg-gray-900 px-4 py-3 text-sm text-white">
        {winner
          ? `By VOUCH's overall trust score, ${winner.full_name} edges ahead (${Math.round(
              winner.scores.total * 100,
            )}/100). Both are viable — pick based on the factors that matter to you.`
          : `${a.full_name} and ${b.full_name} score identically overall — choose on the factor that matters most to you.`}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test `frontend/components/__tests__/VsComparison.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VsComparison from "@/components/VsComparison";
import type { RepoResult } from "@/lib/api";

function repo(name: string, total: number): RepoResult {
  return {
    full_name: name,
    html_url: `https://github.com/${name}`,
    description: "d",
    stars: 5000,
    license: "MIT",
    pushed_at: null,
    created_at: null,
    language: "Rust",
    topics: [],
    scorecard: null,
    advisories_count: 0,
    has_high_advisory: false,
    has_critical_advisory: false,
    pc_details: { stack: "Rust", win_install_bytes: null, win_install_str: null },
    scores: { total, safety: total, popularity: total, maintenance: total, pc_fit: total },
  };
}

describe("VsComparison", () => {
  it("renders both repos and names the higher-trust winner", () => {
    render(<VsComparison a={repo("a/one", 0.9)} b={repo("b/two", 0.5)} />);
    expect(screen.getAllByText("a/one").length).toBeGreaterThan(0);
    expect(screen.getByText(/a\/one edges ahead/)).toBeInTheDocument();
  });

  it("handles a tie", () => {
    render(<VsComparison a={repo("a/one", 0.7)} b={repo("b/two", 0.7)} />);
    expect(screen.getByText(/score identically overall/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify**

Run: `cd frontend && npm run test -- --run components/__tests__/VsComparison.test.tsx`
Expected: PASS (2 tests). Then `npm run typecheck` — clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/VsComparison.tsx frontend/components/__tests__/VsComparison.test.tsx
git commit -m "feat(frontend): VsComparison side-by-side component"
```

---

## Task 3: `/vs/[slug]` SEO page (ISR + metadata + JSON-LD)

**Files:**
- Create: `frontend/app/vs/[slug]/page.tsx`

- [ ] **Step 1: Create `frontend/app/vs/[slug]/page.tsx`**

```tsx
import { fetchRepo } from "@/lib/api";
import { COMPARISONS, getComparison } from "@/lib/comparisons";
import VsComparison from "@/components/VsComparison";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ISR: generate on demand, cache, refresh daily. Empty static params keeps the
// production build independent of the backend.
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Comparison not found | VOUCH" };
  const title = `${c.title}: which to choose? — ${c.category} compared | VOUCH`;
  const description = `${c.title} compared side by side on safety, maintenance, popularity, and footprint. ${c.blurb}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/vs/${c.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE}/vs/${c.slug}`,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function VsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const [aOwner, aName] = c.a.split("/");
  const [bOwner, bName] = c.b.split("/");
  const [a, b] = await Promise.all([
    fetchRepo(aOwner, aName).catch(() => null),
    fetchRepo(bOwner, bName).catch(() => null),
  ]);
  if (!a || !b) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.title,
    description: c.blurb,
    itemListElement: [a, b].map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: r.full_name,
        applicationCategory: "DeveloperApplication",
        url: r.html_url,
        description: r.description,
      },
    })),
  };

  const related = COMPARISONS.filter((x) => x.slug !== c.slug).slice(0, 4);

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-blue-600">
        <Link href="/vs" className="hover:underline">
          ← all comparisons
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="mt-2 max-w-2xl text-gray-600">{c.blurb}</p>
      </header>

      <VsComparison a={a} b={b} />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Related comparisons</h2>
        <ul className="flex flex-wrap gap-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/vs/${r.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-gray-400"
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
```

- [ ] **Step 2: Gate + build (no backend needed — generateStaticParams is empty)**

Run from `D:\vouch\frontend`: `npm run typecheck && npm run build`
Expected: type-clean; build succeeds. Route list now includes `ƒ /vs/[slug]` (dynamic). The build must NOT attempt to fetch (because `generateStaticParams` returns `[]`).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/vs
git commit -m "feat(frontend): /vs/[slug] SEO comparison page (ISR + JSON-LD + metadata)"
```

---

## Task 4: `/vs` index, sitemap, robots

**Files:**
- Create: `frontend/app/vs/page.tsx`
- Create: `frontend/app/sitemap.ts`
- Create: `frontend/app/robots.ts`

- [ ] **Step 1: Create `frontend/app/vs/page.tsx`**

```tsx
import { COMPARISONS } from "@/lib/comparisons";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open-source comparisons — trust, safety & health | VOUCH",
  description:
    "Side-by-side comparisons of popular open-source tools, scored on safety, maintenance, popularity, and footprint.",
};

export default function VsIndex() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Comparisons</h1>
        <p className="mt-2 text-gray-600">
          Popular open-source tools compared on VOUCH&apos;s trust signals.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {COMPARISONS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/vs/${c.slug}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400"
            >
              <span className="font-semibold">{c.title}</span>
              <span className="mt-0.5 block text-xs uppercase tracking-wide text-gray-400">
                {c.category}
              </span>
              <span className="mt-1 block line-clamp-2 text-sm text-gray-600">{c.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/lib/comparisons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = ["", "/vs"].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
  const vsRoutes: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${SITE}/vs/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [...staticRoutes, ...vsRoutes];
}
```

- [ ] **Step 3: Create `frontend/app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Gate + build**

Run from `D:\vouch\frontend`: `npm run typecheck && npm run build`
Expected: type-clean; build succeeds. Route list now includes `○ /vs`, `ƒ /vs/[slug]`, plus `○ /sitemap.xml` and `○ /robots.txt`.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/vs/page.tsx frontend/app/sitemap.ts frontend/app/robots.ts
git commit -m "feat(frontend): /vs index, sitemap.xml, robots.txt"
```

---

## Task 5: Cross-link from landing + docs + final verification

**Files:**
- Modify: `frontend/app/page.tsx` (add a "Popular comparisons" strip)
- Modify: `frontend/.env.local.example` (add `NEXT_PUBLIC_SITE_URL`)
- Modify: `frontend/README.md` (document `/vs` + sitemap)

- [ ] **Step 1: Add a comparisons strip to `frontend/app/page.tsx`**

Add this import at the top with the others:
```tsx
import Link from "next/link";
import { COMPARISONS } from "@/lib/comparisons";
```
Then add this section as the LAST child inside the outer `<div className="space-y-6">`, after `<HomeTabs />`:
```tsx
      <section className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-semibold text-gray-700">Popular comparisons</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {COMPARISONS.slice(0, 6).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/vs/${c.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-gray-400"
              >
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/vs" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Browse all comparisons →
        </Link>
      </section>
```

- [ ] **Step 2: Add `NEXT_PUBLIC_SITE_URL` to `frontend/.env.local.example`**

Append:
```
# Public site URL used for canonical links, sitemap, and robots.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Document in `frontend/README.md`**

Under `## Routes`, add:
```markdown
- `/vs`                    index of curated open-source comparisons
- `/vs/{slug}`             SEO comparison page (e.g. /vs/tauri-vs-electron), ISR-cached
- `/sitemap.xml`, `/robots.txt`  generated from the comparisons registry
```

- [ ] **Step 4: Full frontend gates**

Run from `D:\vouch\frontend`:
```powershell
npm run test -- --run
npm run typecheck
npm run build
```
Expected: all unit tests pass (incl. comparisons + VsComparison), type-clean, build succeeds with `/`, `/vs`, `/vs/[slug]`, `/compare`, `/repo/[owner]/[name]`, `/sitemap.xml`, `/robots.txt` in the route list.

- [ ] **Step 5: Controller (Opus) live end-to-end verification**

With backend running (`python -m app.main`) and frontend dev running, the controller curls:
- `/vs/tauri-vs-electron` → server-renders a real comparison table (both repo names, score rows, verdict line, JSON-LD `<script type="application/ld+json">`).
- `/sitemap.xml` → contains the `/vs/*` URLs.
- `/vs/not-a-real-slug` → 404.
(Run by the controller, not the subagent.)

- [ ] **Step 6: Commit**

```bash
git add frontend/app/page.tsx frontend/.env.local.example frontend/README.md
git commit -m "feat(frontend): cross-link comparisons from landing + docs"
```

---

## Done criteria for Plan 4

- Frontend `npm run test -- --run`, `npm run typecheck`, `npm run build` all green; build needs **no** backend.
- `/vs/[slug]` server-renders a real two-repo trust comparison with verdict, per-page metadata, and JSON-LD; unknown slugs 404.
- `/vs` index lists the curated set; landing cross-links to them; `/sitemap.xml` and `/robots.txt` enumerate them.
- Verified live: `/vs/tauri-vs-electron` renders real GitHub-derived scores; sitemap lists the routes.
- No backend changes, no new dependencies, no paid services.

**Next plan:** `Plan 5 — Deploy` (Vercel frontend + Render/Fly backend on free tiers; create the private GitHub repo; wire `NEXT_PUBLIC_API_BASE`/`NEXT_PUBLIC_SITE_URL`).
