#!/usr/bin/env bash
set -e

# Download vendor binaries if not already present.
# The volume mount overwrites /app/data populated at build time,
# so we must re-run this at container startup.
if [ -f /app/scripts/download-vendors.sh ]; then
  echo "🔧 Checking vendor binaries..."
  DATA_LOCAL_PATH=/app/data sh /app/scripts/download-vendors.sh || true
fi

exec "$@"
