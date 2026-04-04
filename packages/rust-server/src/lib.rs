pub mod build_info;
pub mod error;
pub mod handlers;
pub mod logging;
pub mod middleware;
pub mod router;
pub mod services;

use sea_orm::DatabaseConnection;
use services::storage::StorageProvider;
use std::sync::Arc;

/// 共享应用状态。
pub struct AppState {
    pub db: DatabaseConnection,
    /// Pluggable object storage (local filesystem / S3).
    pub storage: Arc<dyn StorageProvider>,
}

pub use router::build_app;
