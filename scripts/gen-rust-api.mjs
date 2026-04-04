#!/usr/bin/env node

/**
 * 从 Rust 后端生成 TypeScript 类型定义。
 *
 * 工作流程：
 *   1. 运行 `cargo test --lib`，ts-rs 在测试时导出 .ts 文件
 *   2. 收集所有导出的 .ts 文件
 *   3. 生成 barrel index.ts 重新导出所有类型
 *
 * 环境变量：
 *   TS_RS_EXPORT_DIR — ts-rs 类型输出目录（默认：packages/web/src/generated/rust-types）
 */

import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR =
  process.env.TS_RS_EXPORT_DIR ||
  join(ROOT, "packages/web/src/generated/rust-types");

mkdirSync(OUT_DIR, { recursive: true });

// Run cargo test to trigger ts-rs exports
try {
  execSync("cargo test --lib", {
    cwd: join(ROOT, "packages/server"),
    env: { ...process.env, TS_RS_EXPORT_DIR: OUT_DIR },
    stdio: "pipe",
  });
} catch {
  // cargo test may "fail" if there are no test functions yet — that's OK
}

// Collect all .ts files (excluding index.ts)
const files = readdirSync(OUT_DIR)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .sort();

if (files.length === 0) {
  console.log(
    "[gen-rust-api] No ts-rs types found (this is normal for a skeleton project)",
  );
  process.exit(0);
}

// Generate barrel index.ts
const lines = files.map((f) => {
  const name = basename(f, ".ts");
  return `export * from "./${name}";`;
});
writeFileSync(join(OUT_DIR, "index.ts"), `${lines.join("\n")}\n`);

console.log(
  `[gen-rust-api] Generated ${files.length} type files → ${OUT_DIR}/index.ts`,
);
