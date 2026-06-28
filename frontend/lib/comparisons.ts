export interface Comparison {
  slug: string; // "tauri-vs-electron"
  title: string; // "Tauri vs Electron"
  category: string; // human label, e.g. "desktop app frameworks"
  a: string; // repo full_name, e.g. "tauri-apps/tauri"
  b: string; // repo full_name
  blurb: string; // 1-2 sentence intro (shown above the table + used as meta description)
  intro: string; // 2-3 sentence unique paragraph (shown below the table — SEO content depth)
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
    intro:
      "Tauri bundles your web UI against the OS's native webview and a Rust backend, producing installers a fraction of Electron's size with far lower memory use. Electron ships its own Chromium and Node runtime, which means heavier apps but a hugely mature ecosystem and identical rendering everywhere. Choose Tauri when footprint and security matter; choose Electron when you need battle-tested tooling and maximum third-party support.",
  },
  {
    slug: "vite-vs-webpack",
    title: "Vite vs Webpack",
    category: "JavaScript build tools",
    a: "vitejs/vite",
    b: "webpack/webpack",
    blurb:
      "The modern dev-server-first bundler versus the battle-tested incumbent that powers a huge share of production builds.",
    intro:
      "Vite uses native ES modules and esbuild for near-instant dev startup and hot reloads, making it the default for most new frontend projects. Webpack is older and slower to start, but its plugin ecosystem and fine-grained control still win for complex, highly customized production pipelines. For greenfield apps Vite is usually the faster path; for large legacy codebases Webpack's maturity can be worth the configuration cost.",
  },
  {
    slug: "bun-vs-deno",
    title: "Bun vs Deno",
    category: "JavaScript runtimes",
    a: "oven-sh/bun",
    b: "denoland/deno",
    blurb:
      "Two ambitious Node alternatives with different bets on speed, compatibility, and a batteries-included toolchain.",
    intro:
      "Bun optimizes raw speed and Node compatibility, bundling a package manager, test runner, and transpiler into one fast binary. Deno emphasizes security and standards, with permissions-by-default, native TypeScript, and a Web-standard API surface. Pick Bun for performance and drop-in Node migration; pick Deno when secure-by-default execution and first-class TypeScript matter more.",
  },
  {
    slug: "svelte-vs-react",
    title: "Svelte vs React",
    category: "frontend frameworks",
    a: "sveltejs/svelte",
    b: "facebook/react",
    blurb:
      "A compiler-first framework with minimal runtime versus the dominant library with the largest ecosystem.",
    intro:
      "Svelte compiles components to small, efficient vanilla JavaScript at build time, shipping almost no runtime and offering a gentle learning curve. React renders via a virtual DOM and runtime library, trading some bundle size for the biggest ecosystem, hiring pool, and tooling in frontend. Svelte rewards small, fast apps and solo developers; React is the safer bet for large teams and long-lived products.",
  },
  {
    slug: "fastapi-vs-flask",
    title: "FastAPI vs Flask",
    category: "Python web frameworks",
    a: "fastapi/fastapi",
    b: "pallets/flask",
    blurb:
      "Modern async-first APIs with typed validation versus the minimal, endlessly flexible classic microframework.",
    intro:
      "FastAPI builds on type hints and Pydantic to give you automatic validation, async support, and OpenAPI docs out of the box, making it ideal for modern APIs. Flask is older and deliberately minimal, leaving most choices to you, which suits small apps and teams that want full control. Reach for FastAPI when you want speed and typed contracts; reach for Flask when you want simplicity and a huge body of existing extensions.",
  },
  {
    slug: "pnpm-vs-npm",
    title: "pnpm vs npm",
    category: "JavaScript package managers",
    a: "pnpm/pnpm",
    b: "npm/cli",
    blurb:
      "A fast, disk-efficient package manager with strict resolution versus the default that ships with Node.",
    intro:
      "pnpm uses a content-addressable store and hard links so dependencies are shared across projects, saving disk space and installing faster, with stricter, more correct resolution. npm is the default that ships with Node, so it needs zero setup and has universal compatibility. Choose pnpm for monorepos and speed; stick with npm when you want the lowest-friction default everyone already has.",
  },
  {
    slug: "react-vs-vue",
    title: "React vs Vue",
    category: "frontend frameworks",
    a: "facebook/react",
    b: "vuejs/core",
    blurb:
      "The industry-standard library with the biggest ecosystem versus the approachable framework with batteries included.",
    intro:
      "React gives you a minimal, unopinionated core and an enormous ecosystem, but you assemble routing, state, and tooling yourself. Vue ships a more complete, approachable framework with an official router and store, and a template syntax many find gentler to learn. Pick React for ecosystem depth and hiring; pick Vue for a faster ramp and a cohesive, batteries-included experience.",
  },
  {
    slug: "angular-vs-react",
    title: "Angular vs React",
    category: "frontend frameworks",
    a: "angular/angular",
    b: "facebook/react",
    blurb:
      "A full, opinionated framework versus a flexible library you compose yourself.",
    intro:
      "Angular is a complete framework with built-in routing, forms, dependency injection, and TypeScript-first conventions, which suits large enterprise teams that value structure. React is a lighter library that leaves architecture to you, trading guardrails for flexibility and a larger ecosystem. Choose Angular when you want one opinionated way to build; choose React when you want freedom and the widest community.",
  },
  {
    slug: "nextjs-vs-remix",
    title: "Next.js vs Remix",
    category: "React frameworks",
    a: "vercel/next.js",
    b: "remix-run/remix",
    blurb:
      "The dominant React meta-framework versus the web-standards-focused challenger built on nested routing.",
    intro:
      "Next.js offers a huge feature surface — the App Router, server components, ISR, and tight Vercel integration — making it the default for most React apps. Remix leans into web fundamentals like forms, fetch, and progressive enhancement, with nested routing and excellent data loading. Pick Next.js for ecosystem and rendering flexibility; pick Remix when you value web standards and resilient, no-JS-friendly UX.",
  },
  {
    slug: "svelte-vs-solid",
    title: "Svelte vs Solid",
    category: "frontend frameworks",
    a: "sveltejs/svelte",
    b: "solidjs/solid",
    blurb:
      "Two performance-first frameworks: compiler-based Svelte versus fine-grained reactive Solid.",
    intro:
      "Svelte compiles components ahead of time for tiny bundles and a friendly developer experience. Solid keeps a React-like JSX syntax but uses fine-grained reactivity with no virtual DOM, delivering some of the fastest runtime performance available. Choose Svelte for ergonomics and ecosystem momentum; choose Solid when you want React-style code with top-tier reactivity and speed.",
  },
  {
    slug: "postgres-vs-mysql",
    title: "PostgreSQL vs MySQL",
    category: "relational databases",
    a: "postgres/postgres",
    b: "mysql/mysql-server",
    blurb:
      "The advanced, standards-rich database versus the ubiquitous, easy-to-run workhorse.",
    intro:
      "PostgreSQL is known for correctness, rich data types, advanced indexing, and powerful extensions, making it the favorite for complex, write-heavy, or analytical workloads. MySQL is simpler to operate, extremely widely deployed, and strong for read-heavy web applications. Choose Postgres for feature depth and data integrity; choose MySQL for operational simplicity and a massive hosting footprint.",
  },
  {
    slug: "redis-vs-memcached",
    title: "Redis vs Memcached",
    category: "in-memory caches",
    a: "redis/redis",
    b: "memcached/memcached",
    blurb:
      "A versatile data-structure server versus a lean, single-purpose memory cache.",
    intro:
      "Redis is far more than a cache — it offers persistence, pub/sub, streams, and rich data structures, making it a general-purpose in-memory store. Memcached does one thing, simple key/value caching, extremely well and with minimal memory overhead. Choose Redis when you need durability and features; choose Memcached for the leanest possible caching layer.",
  },
  {
    slug: "docker-vs-podman",
    title: "Docker vs Podman",
    category: "containers",
    a: "moby/moby",
    b: "containers/podman",
    blurb:
      "The container standard versus the daemonless, rootless-first alternative.",
    intro:
      "Docker (built on the Moby engine) is the de facto standard with the smoothest tooling and the largest community. Podman runs containers without a long-lived daemon and is rootless by default, which appeals to security-conscious and Kubernetes-aligned teams. Choose Docker for the most frictionless experience; choose Podman for daemonless, rootless security and tighter Kubernetes affinity.",
  },
  {
    slug: "kubernetes-vs-nomad",
    title: "Kubernetes vs Nomad",
    category: "orchestrators",
    a: "kubernetes/kubernetes",
    b: "hashicorp/nomad",
    blurb:
      "The powerful industry-standard orchestrator versus the simpler, lighter scheduler.",
    intro:
      "Kubernetes is the dominant orchestrator with an enormous ecosystem, but its power comes with real operational complexity. Nomad is a single binary that schedules containers and non-container workloads alike, prized for being dramatically simpler to run. Choose Kubernetes for ecosystem and scale; choose Nomad when you want orchestration without the operational weight.",
  },
  {
    slug: "tailwindcss-vs-bootstrap",
    title: "Tailwind CSS vs Bootstrap",
    category: "CSS frameworks",
    a: "tailwindlabs/tailwindcss",
    b: "twbs/bootstrap",
    blurb:
      "Utility-first CSS you compose versus a ready-made component library.",
    intro:
      "Tailwind gives you low-level utility classes to build any design directly in your markup, with no opinion on how components should look. Bootstrap ships pre-styled components and a grid so you can assemble familiar UIs fast, at the cost of a recognizable default look. Choose Tailwind for custom design systems; choose Bootstrap for the quickest path to a conventional, working UI.",
  },
  {
    slug: "express-vs-fastify",
    title: "Express vs Fastify",
    category: "Node.js web frameworks",
    a: "expressjs/express",
    b: "fastify/fastify",
    blurb:
      "The ubiquitous minimal framework versus the faster, schema-driven newcomer.",
    intro:
      "Express is the long-standing default for Node servers — minimal, flexible, and supported by virtually every tutorial and middleware. Fastify focuses on performance and developer experience with built-in schema validation, logging, and significantly higher throughput. Choose Express for ubiquity and familiarity; choose Fastify when speed and structured validation matter.",
  },
  {
    slug: "django-vs-flask",
    title: "Django vs Flask",
    category: "Python web frameworks",
    a: "django/django",
    b: "pallets/flask",
    blurb:
      "The batteries-included framework versus the minimal microframework.",
    intro:
      "Django ships an ORM, admin, auth, and migrations out of the box, making it ideal for content-heavy apps where you want conventions and speed of delivery. Flask gives you a tiny core and lets you pick every component, which suits small services and teams that want control. Choose Django to move fast with batteries included; choose Flask for minimalism and flexibility.",
  },
  {
    slug: "pytorch-vs-tensorflow",
    title: "PyTorch vs TensorFlow",
    category: "machine learning frameworks",
    a: "pytorch/pytorch",
    b: "tensorflow/tensorflow",
    blurb:
      "The research-favorite dynamic framework versus the production-hardened ecosystem.",
    intro:
      "PyTorch's dynamic, Pythonic style made it the default for research and rapid experimentation, and its ecosystem now covers production too. TensorFlow offers a mature deployment story across mobile, web, and serving, with strong tooling for large-scale production. Choose PyTorch for research velocity and ergonomics; choose TensorFlow when your priority is end-to-end production deployment.",
  },
  {
    slug: "rust-vs-go",
    title: "Rust vs Go",
    category: "systems programming languages",
    a: "rust-lang/rust",
    b: "golang/go",
    blurb:
      "Maximum performance and safety versus simplicity and fast iteration.",
    intro:
      "Rust offers memory safety without a garbage collector and top-tier performance, at the cost of a steeper learning curve and longer compile times. Go is intentionally simple, compiles fast, and has excellent concurrency and tooling, which makes teams productive quickly. Choose Rust for performance-critical, correctness-sensitive systems; choose Go for fast delivery of networked services and CLIs.",
  },
  {
    slug: "esbuild-vs-swc",
    title: "esbuild vs SWC",
    category: "JavaScript build tools",
    a: "evanw/esbuild",
    b: "swc-project/swc",
    blurb:
      "Two ultra-fast native bundler/transpilers powering modern toolchains.",
    intro:
      "esbuild, written in Go, is an extremely fast bundler and minifier that underpins tools like Vite for development. SWC, written in Rust, is a fast transpiler and bundler used by Next.js and as a Babel replacement. Choose esbuild for blazing bundling and simplicity; choose SWC when you need a fast, extensible Babel/transpilation layer with plugin support.",
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
