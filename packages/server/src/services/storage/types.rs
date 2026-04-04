use bytes::Bytes;

pub struct UploadOptions {
    pub content_type: Option<String>,
}

pub struct StorageObject {
    pub key: String,
    pub size: u64,
}

#[async_trait::async_trait]
pub trait StorageProvider: Send + Sync {
    async fn upload(
        &self,
        key: &str,
        body: Bytes,
        options: Option<UploadOptions>,
    ) -> Result<(), String>;

    async fn download(&self, key: &str) -> Result<Bytes, String>;

    async fn delete(&self, key: &str) -> Result<(), String>;

    async fn exists(&self, key: &str) -> Result<bool, String>;

    async fn list(&self, prefix: Option<&str>) -> Result<Vec<StorageObject>, String>;
}
