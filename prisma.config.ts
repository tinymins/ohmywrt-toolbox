import path from "node:path";
import process from "node:process";
import { defineConfig } from "prisma/config";

// Load root .env — Prisma 7 no longer auto-loads .env for the datasource URL.
// In Docker, .env may not exist; DATABASE_URL is set via environment instead.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, ".env"));
} catch {
  // .env not found — rely on process.env.DATABASE_URL from environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
