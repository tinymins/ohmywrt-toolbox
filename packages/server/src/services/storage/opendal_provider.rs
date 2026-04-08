use bytes::Bytes;
use opendal::{services::Fs, Operator};

use super::types::{StorageObject, StorageProvider, UploadOptions};

pub struct OpendalStorageProvider {
    op: Operator,
}

impl OpendalStorageProvider {
    pub fn new(root: &str) -> Result<Self, String> {
        let op = Operator::new(Fs::default().root(root))
            .map_err(|e| format!("OpenDAL init failed: {e}"))?
            .finish();
        Ok(Self { op })
    }
}

#[async_trait::async_trait]
impl StorageProvider for OpendalStorageProvider {
    async fn upload(
        &self,
        key: &str,
        body: Bytes,
        options: Option<UploadOptions>,
    ) -> Result<(), String> {
        let content_type = options
            .and_then(|o| o.content_type)
            .unwrap_or_else(|| "application/octet-stream".to_string());

        self.op
            .write_with(key, body)
            .content_type(&content_type)
            .await
            .map(|_| ())
            .map_err(|e| format!("Upload failed: {e}"))
    }

    async fn download(&self, key: &str) -> Result<Bytes, String> {
        let buf = self
            .op
            .read(key)
            .await
            .map_err(|e| format!("Download failed: {e}"))?;
        Ok(buf.to_bytes())
    }

    async fn delete(&self, key: &str) -> Result<(), String> {
        self.op
            .delete(key)
            .await
            .map_err(|e| format!("Delete failed: {e}"))
    }

    async fn exists(&self, key: &str) -> Result<bool, String> {
        self.op
            .exists(key)
            .await
            .map_err(|e| format!("Exists check failed: {e}"))
    }

    async fn list(&self, prefix: Option<&str>) -> Result<Vec<StorageObject>, String> {
        let prefix = match prefix {
            Some("") | None => String::new(),
            Some(p) if p.ends_with('/') => p.to_string(),
            Some(p) => format!("{p}/"),
        };

        let entries = self
            .op
            .list_with(&prefix)
            .recursive(true)
            .await
            .map_err(|e| format!("List failed: {e}"))?;

        Ok(entries
            .into_iter()
            .filter(|e| !e.path().ends_with('/'))
            .map(|e| StorageObject {
                key: e.path().to_string(),
                size: e.metadata().content_length(),
            })
            .collect())
    }
}
