mod opendal_provider;
mod types;

pub use types::{StorageObject, StorageProvider, UploadOptions};

use opendal_provider::OpendalStorageProvider;
use std::sync::Arc;
use tracing::info;

/// Create a storage provider from environment configuration.
/// Currently uses local filesystem via OpenDAL.
pub fn create_storage_from_env(data_local_path: &str) -> Arc<dyn StorageProvider> {
    let base_path = format!("{data_local_path}/storage");

    info!("Storage: using local filesystem via OpenDAL (path={base_path})");

    Arc::new(
        OpendalStorageProvider::new(&base_path).expect("Storage provider initialization failed"),
    )
}
