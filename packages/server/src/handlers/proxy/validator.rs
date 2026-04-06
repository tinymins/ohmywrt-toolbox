use serde_json::{json, Value};
use std::io::Write;
use tempfile::NamedTempFile;
use tokio::process::Command;
use tracing::warn;

/// Result of validating a generated config against the real binary.
#[derive(Debug)]
pub struct ValidationResult {
    pub valid: bool,
    pub method: &'static str,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
    pub skipped: bool,
    pub skip_reason: Option<String>,
}

impl ValidationResult {
    fn skipped(reason: &str) -> Self {
        Self {
            valid: true,
            method: "none",
            warnings: Vec::new(),
            errors: Vec::new(),
            skipped: true,
            skip_reason: Some(reason.to_string()),
        }
    }

    pub fn to_json(&self) -> Value {
        if self.skipped {
            json!({
                "skipped": true,
                "reason": self.skip_reason,
            })
        } else {
            json!({
                "valid": self.valid,
                "method": self.method,
                "warnings": self.warnings,
                "errors": self.errors,
            })
        }
    }
}

/// Find the sing-box binary path.
/// Priority: SINGBOX_BIN env → "sing-box" in PATH.
fn find_singbox_bin(format: &str) -> Option<String> {
    // For v12, allow a separate binary via SINGBOX_V12_BIN
    if format == "sing-box-v12" {
        if let Ok(bin) = std::env::var("SINGBOX_V12_BIN") {
            if !bin.is_empty() {
                return Some(bin);
            }
        }
    }
    // Generic sing-box binary
    if let Ok(bin) = std::env::var("SINGBOX_BIN") {
        if !bin.is_empty() {
            return Some(bin);
        }
    }
    // Try PATH
    if which_exists("sing-box") {
        return Some("sing-box".to_string());
    }
    None
}

/// Check if a command exists in PATH.
fn which_exists(cmd: &str) -> bool {
    std::process::Command::new("which")
        .arg(cmd)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Validate a sing-box JSON config using the real binary.
///
/// Security: runs with `unshare --net` (network namespace isolation)
/// and `timeout 5s` to prevent hangs. Falls back to direct execution
/// if unshare is unavailable.
pub async fn validate_singbox_config(config_json: &str, format: &str) -> ValidationResult {
    let bin = match find_singbox_bin(format) {
        Some(b) => b,
        None => {
            return ValidationResult::skipped("sing-box binary not found");
        }
    };

    // Write config to temp file
    let tmp = match NamedTempFile::new() {
        Ok(mut f) => {
            if let Err(e) = f.write_all(config_json.as_bytes()) {
                warn!("Failed to write temp config: {}", e);
                return ValidationResult::skipped(&format!("temp file write error: {}", e));
            }
            f
        }
        Err(e) => {
            warn!("Failed to create temp file: {}", e);
            return ValidationResult::skipped(&format!("temp file create error: {}", e));
        }
    };
    let tmp_path = tmp.path().to_string_lossy().to_string();

    // Try with unshare --net for network isolation, fall back to direct
    let output = if which_exists("unshare") {
        Command::new("timeout")
            .args(["5s", "unshare", "--net", "--", &bin, "check", "-c", &tmp_path])
            .output()
            .await
    } else {
        Command::new("timeout")
            .args(["5s", &bin, "check", "-c", &tmp_path])
            .output()
            .await
    };

    // tmp file is dropped (deleted) here automatically

    match output {
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let combined = format!("{}{}", stdout, stderr);

            let mut warnings = Vec::new();
            let mut errors = Vec::new();

            for line in combined.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                if trimmed.contains("WARN") {
                    warnings.push(trimmed.to_string());
                } else if trimmed.contains("FATAL") || trimmed.contains("ERROR") {
                    errors.push(trimmed.to_string());
                } else if !out.status.success() {
                    // Any other output on failure is an error
                    errors.push(trimmed.to_string());
                }
            }

            let valid = out.status.success() && errors.is_empty();

            ValidationResult {
                valid,
                method: "sing-box-binary",
                warnings,
                errors,
                skipped: false,
                skip_reason: None,
            }
        }
        Err(e) => {
            warn!("sing-box check execution failed: {}", e);
            ValidationResult::skipped(&format!("execution error: {}", e))
        }
    }
}

/// Validate a Clash YAML config (syntax + required fields).
/// No external binary needed — mihomo has no check command.
pub fn validate_clash_config(config_yaml: &str) -> ValidationResult {
    // Parse YAML
    let parsed: Result<Value, _> = serde_yaml::from_str(config_yaml);
    match parsed {
        Err(e) => ValidationResult {
            valid: false,
            method: "yaml-syntax",
            warnings: Vec::new(),
            errors: vec![format!("YAML parse error: {}", e)],
            skipped: false,
            skip_reason: None,
        },
        Ok(doc) => {
            let mut warnings = Vec::new();
            let mut errors = Vec::new();

            // Check required top-level keys
            let required = ["proxies", "proxy-groups", "rules"];
            for key in &required {
                if doc.get(key).is_none() {
                    errors.push(format!("Missing required field: {}", key));
                }
            }

            // Check proxies is a non-empty array
            if let Some(proxies) = doc.get("proxies") {
                if let Some(arr) = proxies.as_array() {
                    if arr.is_empty() {
                        warnings.push("proxies array is empty".to_string());
                    }
                } else {
                    errors.push("proxies must be an array".to_string());
                }
            }

            // Check proxy-groups is an array
            if let Some(groups) = doc.get("proxy-groups") {
                if groups.as_array().is_none() {
                    errors.push("proxy-groups must be an array".to_string());
                }
            }

            // Check rules is an array
            if let Some(rules) = doc.get("rules") {
                if rules.as_array().is_none() {
                    errors.push("rules must be an array".to_string());
                }
            }

            let valid = errors.is_empty();
            ValidationResult {
                valid,
                method: "yaml-syntax",
                warnings,
                errors,
                skipped: false,
                skip_reason: None,
            }
        }
    }
}

/// Validate a config based on format, dispatching to the right validator.
pub async fn validate_config(config_output: &str, format: &str) -> ValidationResult {
    match format {
        "sing-box" | "sing-box-v12" => validate_singbox_config(config_output, format).await,
        "clash" | "clash-meta" => validate_clash_config(config_output),
        _ => ValidationResult::skipped(&format!("unknown format: {}", format)),
    }
}
