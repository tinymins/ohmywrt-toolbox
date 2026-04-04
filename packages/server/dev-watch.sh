#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RUN_SCRIPT="$SCRIPT_DIR/dev-run.sh"

WATCH_DIR=..
WATCH_EXTS=rs,toml,env

if command -v watchexec >/dev/null 2>&1; then
  echo "[rust-dev] using watchexec"
  exec watchexec \
    --watch "$WATCH_DIR" \
    --exts "$WATCH_EXTS" \
    --restart \
    --stop-signal SIGTERM \
    --no-process-group \
    -- "$RUN_SCRIPT"
fi

if cargo watch --version >/dev/null 2>&1; then
  echo "[rust-dev] using cargo-watch (install watchexec-cli to use the preferred watcher automatically)"
  exec cargo watch \
    -w "$WATCH_DIR" \
    -i "*/node_modules/*" \
    -i "*/target/*" \
    -i "*/dist/*" \
    -i "*/generated/*" \
    -i "*.log" \
    -i "*.ts" \
    -i "*.tsx" \
    -i "*.js" \
    -i "*.jsx" \
    -i "*.css" \
    -i "*.html" \
    -i "*.lock" \
    -s "$RUN_SCRIPT"
fi

echo "[rust-dev] missing watcher dependency for dev mode." >&2
echo "[rust-dev] install one of the following and retry:" >&2
echo "[rust-dev]   cargo install --locked watchexec-cli" >&2
echo "[rust-dev]   cargo install cargo-watch" >&2
exit 1
