use serde::{Deserialize, Serialize};

/// A generic Clash proxy node, serde-deserializable from JSON/YAML.
/// Core fields are explicit; every other key ends up in `extra`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClashProxy {
    pub name: String,

    #[serde(rename = "type")]
    pub proxy_type: String,

    pub server: String,

    pub port: u16,

    /// All remaining fields (uuid, cipher, ws-opts, tls, …).
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

impl ClashProxy {
    /// Convenience: read an optional string field from `extra`.
    pub fn str_field(&self, key: &str) -> Option<&str> {
        self.extra.get(key).and_then(|v| v.as_str())
    }

    /// Convenience: read an optional bool field from `extra`.
    pub fn bool_field(&self, key: &str) -> Option<bool> {
        self.extra.get(key).and_then(|v| v.as_bool())
    }

    /// Convenience: read an optional u64 field from `extra`.
    pub fn u64_field(&self, key: &str) -> Option<u64> {
        self.extra.get(key).and_then(|v| v.as_u64())
    }

    /// Convenience: read an optional i64 field from `extra`.
    pub fn i64_field(&self, key: &str) -> Option<i64> {
        self.extra.get(key).and_then(|v| v.as_i64())
    }
}
