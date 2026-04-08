const features = {
  heading: "Warum dieses Boilerplate",
  subheading:
    "Produktionsreife Full-Stack-Architektur — jede Schicht von Datenbank bis Deployment, kampferprobt und einsatzbereit",
  trpc: {
    title: "End-to-End-Typsicherheit",
    desc: "Rust-DTOs generieren TypeScript-Typen automatisch via ts-rs, kombiniert mit Zod v4-Validierung — kein Laufzeit-Overhead, vollständige Typsicherheit",
  },
  ssr: {
    title: "React 19 + React Router v7",
    desc: "Modernste React-Architektur mit dateibasiertem Routing, Client-Loadern, Code-Splitting und TanStack Query v5",
  },
  db: {
    title: "Sea-ORM + PostgreSQL 18",
    desc: "Asynchrones Rust-ORM mit typsicheren Abfragen und Connection-Pooling, plus Prisma für Schema-Migrationen",
  },
  backend: {
    title: "Rust (Axum) Backend",
    desc: "Blitzschnelles Web-Framework — kompiliert zu einer einzelnen Binärdatei mit jemalloc, speichersicher mit Zero-Cost-Abstraktionen",
  },
  tailwind: {
    title: "TailwindCSS 4 + Dark Mode",
    desc: "Utility-First-Styling mit CSS-Variablen-Theming, Hell-/Dunkelmodus und einer eigenen Komponentenbibliothek ohne UI-Frameworks",
  },
  devtools: {
    title: "Strikte Entwicklungstools",
    desc: "Cargo Workspace mit Clippy Pedantic-Lints, rustfmt, Biome für TypeScript und Turborepo für orchestrierte Builds",
  },
  deploy: {
    title: "Ein-Befehl-Deployment",
    desc: "Mehrstufiger Docker-Build — Rust-Binary + eingebettete SPA-Dateien, Ein-Befehl-Deploy via SSH auf jeden Server",
  },
  multiplatform: {
    title: "Web + Mini Program + WASM",
    desc: "React SPA, WeChat Mini Program (Taro 4) und WebAssembly-Module — drei Plattformen aus einem Monorepo",
  },
};

export default features;
