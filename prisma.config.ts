import path from "node:path";
import process from "node:process";
import { defineConfig } from "prisma/config";

// Load root .env — Prisma 7 no longer auto-loads .env for the datasource URL.
process.loadEnvFile(path.resolve(import.meta.dirname, ".env"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
