#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."
cd "$SCRIPT_DIR"

# Load root .env for shared config (DATABASE_URL, feature flags)
set -a
[ -f "$ROOT_DIR/.env" ] && . "$ROOT_DIR/.env"
# Load local .env for system-specific overrides (LOG_LEVEL)
[ -f .env ] && . .env
set +a

# Resolve DATA_LOCAL_PATH to absolute path (relative to repo root)
if [ -n "${DATA_LOCAL_PATH:-}" ]; then
  export DATA_LOCAL_PATH="$(cd "$ROOT_DIR" && mkdir -p "$DATA_LOCAL_PATH" && cd "$DATA_LOCAL_PATH" && pwd)"
fi

# Dev mode: default to debug-level logs unless explicitly configured.
if [ -z "${RUST_LOG:-}" ] && [ -z "${LOG_LEVEL:-}" ]; then
  export RUST_LOG="debug,hyper=info,h2=info,tower=info,rustls=info"
fi

# If RUST_DEV_COMMAND is set, delegate entirely to it.
if [ -n "${RUST_DEV_COMMAND:-}" ]; then
  exec bash -lc "$RUST_DEV_COMMAND"
fi

# Default flow: build (debug) → background ts-rs export → start server
cargo build 2>&1 || exit $?

# ts-rs type generation — runs in background so server starts immediately.
(
  ROOT="$SCRIPT_DIR/../.."
  OUT="$ROOT/packages/web/src/generated/rust-types"
  mkdir -p "$OUT"
  TS_RS_EXPORT_DIR="$OUT" cargo test --lib 2>/dev/null || true
  COUNT=$(ls "$OUT"/*.ts 2>/dev/null | grep -v index.ts | wc -l)
  [ "$COUNT" -gt 0 ] && echo "[rust-dev] ts-rs types updated ($COUNT files)"
) &

exec "$ROOT_DIR/target/debug/ohmywrt-toolbox-server" --listen 0.0.0.0:5678
