const features = {
  heading: "Why This Boilerplate",
  subheading:
    "Production-grade full-stack architecture — every layer from database to deployment, battle-tested and ready to ship",
  trpc: {
    title: "End-to-End Type Safety",
    desc: "Rust DTOs auto-generate TypeScript types via ts-rs, paired with Zod v4 validation — zero runtime overhead, full-chain type safety",
  },
  ssr: {
    title: "React 19 + React Router v7",
    desc: "Cutting-edge React with file-based routing, client loaders, code splitting, and TanStack Query v5 for server state",
  },
  db: {
    title: "Sea-ORM + PostgreSQL 18",
    desc: "Async Rust ORM with type-safe queries, connection pooling, and Prisma for zero-downtime schema migrations",
  },
  backend: {
    title: "Rust (Axum) Backend",
    desc: "Blazing-fast async web framework — compiles to a single binary with jemalloc, memory-safe with zero-cost abstractions",
  },
  tailwind: {
    title: "TailwindCSS 4 + Dark Mode",
    desc: "Utility-first styling with CSS variable theming, light/dark mode, and a custom component library — no third-party UI frameworks",
  },
  devtools: {
    title: "Strict Dev Toolchain",
    desc: "Cargo workspace with clippy pedantic lints, rustfmt, Biome for TypeScript, and Turborepo for orchestrated builds",
  },
  deploy: {
    title: "One-Command Deployment",
    desc: "Multi-stage Docker build — Rust binary + embedded SPA static files, one-command deploy to any server via SSH",
  },
  multiplatform: {
    title: "Web + Mini Program + WASM",
    desc: "React SPA, WeChat Mini Program (Taro 4), and WebAssembly modules — three platforms from one monorepo",
  },
};

export default features;
