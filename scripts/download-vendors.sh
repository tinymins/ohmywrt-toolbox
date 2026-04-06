#!/usr/bin/env bash
# download-vendors.sh — Download proxy tool binaries for config validation.
#
# Downloads sing-box and mihomo binaries to DATA_LOCAL_PATH/vendors/.
# Safe to run multiple times: skips if the correct version is already present.
#
# Usage:
#   ./scripts/download-vendors.sh           # uses DATA_LOCAL_PATH from env or .env
#   DATA_LOCAL_PATH=/app/data ./scripts/download-vendors.sh
#
# Environment variables:
#   DATA_LOCAL_PATH   — base directory for vendor binaries (default: .data)
#   SINGBOX_V11_VER   — sing-box version for v1.11 format (default: 1.11.0)
#   SINGBOX_V12_VER   — sing-box version for v1.12 format (default: 1.12.25)
#   MIHOMO_VER        — mihomo version (default: 1.19.22)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env from repo root if present (won't overwrite existing env vars)
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # Only load vars not already set
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ -z "$key" || "$key" == \#* ]] && continue
    # Remove surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    # Only set if not already defined
    if [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < "$REPO_ROOT/.env"
  set +a
fi

# Configuration with defaults
DATA_LOCAL_PATH="${DATA_LOCAL_PATH:-.data}"
SINGBOX_V11_VER="${SINGBOX_V11_VER:-1.11.0}"
SINGBOX_V12_VER="${SINGBOX_V12_VER:-1.12.25}"
MIHOMO_VER="${MIHOMO_VER:-1.19.22}"

# Resolve DATA_LOCAL_PATH relative to repo root
if [[ "$DATA_LOCAL_PATH" != /* ]]; then
  DATA_LOCAL_PATH="$REPO_ROOT/$DATA_LOCAL_PATH"
fi

VENDORS_DIR="$DATA_LOCAL_PATH/vendors"

# Detect architecture
detect_arch() {
  local machine
  machine="$(uname -m)"
  case "$machine" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    *)
      echo "WARN: Unsupported architecture: $machine" >&2
      return 1
      ;;
  esac
}

# Check if a vendor binary is already the correct version
check_version_marker() {
  local dir="$1" expected_version="$2"
  local marker="$dir/.version"
  if [ -f "$marker" ] && [ "$(cat "$marker")" = "$expected_version" ]; then
    return 0
  fi
  return 1
}

# Write version marker after successful download
write_version_marker() {
  local dir="$1" version="$2"
  echo "$version" > "$dir/.version"
}

# Download and extract sing-box
download_singbox() {
  local version="$1" target_dir="$2" arch="$3"
  local url="https://github.com/SagerNet/sing-box/releases/download/v${version}/sing-box-${version}-linux-${arch}.tar.gz"
  local tmp_file

  if check_version_marker "$target_dir" "$version" && [ -x "$target_dir/sing-box" ]; then
    echo "  ✓ sing-box $version already exists, skipping"
    return 0
  fi

  echo "  ↓ Downloading sing-box v${version} (${arch})..."
  mkdir -p "$target_dir"
  tmp_file="$(mktemp)"
  if curl -fsSL --connect-timeout 15 --max-time 120 "$url" -o "$tmp_file"; then
    tar -xzf "$tmp_file" -C "$target_dir" --strip-components=1 "sing-box-${version}-linux-${arch}/sing-box"
    chmod +x "$target_dir/sing-box"
    write_version_marker "$target_dir" "$version"
    rm -f "$tmp_file"
    echo "  ✓ sing-box v${version} installed"
  else
    rm -f "$tmp_file"
    echo "  ✗ Failed to download sing-box v${version}" >&2
    return 1
  fi
}

# Download and extract mihomo
download_mihomo() {
  local version="$1" target_dir="$2" arch="$3"
  local url="https://github.com/MetaCubeX/mihomo/releases/download/v${version}/mihomo-linux-${arch}-v${version}.gz"
  local tmp_file

  if check_version_marker "$target_dir" "$version" && [ -x "$target_dir/mihomo" ]; then
    echo "  ✓ mihomo $version already exists, skipping"
    return 0
  fi

  echo "  ↓ Downloading mihomo v${version} (${arch})..."
  mkdir -p "$target_dir"
  tmp_file="$(mktemp)"
  if curl -fsSL --connect-timeout 15 --max-time 120 "$url" -o "$tmp_file"; then
    gunzip -c "$tmp_file" > "$target_dir/mihomo"
    chmod +x "$target_dir/mihomo"
    write_version_marker "$target_dir" "$version"
    rm -f "$tmp_file"
    echo "  ✓ mihomo v${version} installed"
  else
    rm -f "$tmp_file"
    echo "  ✗ Failed to download mihomo v${version}" >&2
    return 1
  fi
}

# ---- Main ----

echo "📦 Downloading vendor binaries to $VENDORS_DIR"

ARCH="$(detect_arch)" || {
  echo "WARN: Skipping vendor binary download (unsupported architecture)" >&2
  exit 0
}

# Track failures but don't abort — validation gracefully handles missing binaries
failures=0

echo ""
echo "sing-box v${SINGBOX_V11_VER} (v1.11 format):"
download_singbox "$SINGBOX_V11_VER" "$VENDORS_DIR/sing-box-v11" "$ARCH" || ((failures++))

echo ""
echo "sing-box v${SINGBOX_V12_VER} (v1.12 format):"
download_singbox "$SINGBOX_V12_VER" "$VENDORS_DIR/sing-box-v12" "$ARCH" || ((failures++))

echo ""
echo "mihomo v${MIHOMO_VER} (clash/clash-meta format):"
download_mihomo "$MIHOMO_VER" "$VENDORS_DIR/mihomo" "$ARCH" || ((failures++))

echo ""
if [ "$failures" -gt 0 ]; then
  echo "⚠ $failures download(s) failed. Config validation will skip missing binaries."
  # Exit 0 — don't break npm install or Docker build for optional binaries
  exit 0
else
  echo "✅ All vendor binaries ready"
fi
