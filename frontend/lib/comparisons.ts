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
