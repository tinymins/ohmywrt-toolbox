//! rs-fullstack-server — 基于 Axum 的 HTTP 服务器骨架。

#[cfg(not(target_env = "msvc"))]
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;

use clap::Parser;
use std::{env, sync::Arc};

use rs_fullstack_server::{build_app, build_info};
use tracing::info;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

#[derive(Parser, Debug)]
#[command(name = "rs-fullstack-server")]
#[command(about = "通用 Rust HTTP 服务器")]
struct Args {
    /// HTTP 监听地址
    #[arg(long, default_value = "0.0.0.0:5678")]
    listen: String,
}

fn main() {
    tokio::runtime::Builder::new_multi_thread()
        .thread_name_fn(|| {
            use std::sync::atomic::{AtomicUsize, Ordering};
            static ID: AtomicUsize = AtomicUsize::new(0);
            format!("rs-fullstack-w-{}", ID.fetch_add(1, Ordering::Relaxed))
        })
        .thread_stack_size(16 * 1024 * 1024)
        .enable_all()
        .build()
        .expect("failed to build tokio runtime")
        .block_on(async_main());
}

async fn async_main() {
    dotenvy::dotenv().ok();

    // Priority: RUST_LOG > LOG_LEVEL > default (info)
    let filter = tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        let base = env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string());
        let directives = match base.to_lowercase().as_str() {
            "trace" | "debug" => {
                format!("{base},hyper=info,h2=info,tower=info,rustls=info")
            }
            _ => base.to_string(),
        };
        tracing_subscriber::EnvFilter::new(directives)
    });

    let fmt_layer = tracing_subscriber::fmt::layer()
        .event_format(rs_fullstack_server::logging::PrettyFormatter)
        .with_ansi(true);

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt_layer)
        .init();

    let args = Args::parse();
    eprintln!("{}", build_info::startup_banner());

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL is required");

    let db = sea_orm::Database::connect(&database_url)
        .await
        .expect("failed to connect to PostgreSQL");

    info!("database connected");

    let data_local_path = env::var("DATA_LOCAL_PATH").unwrap_or_else(|_| ".data".to_string());
    let storage =
        rs_fullstack_server::services::storage::create_storage_from_env(&data_local_path).await;

    let state = Arc::new(rs_fullstack_server::AppState { db, storage });

    let app = build_app(state);
    let listener = tokio::net::TcpListener::bind(&args.listen)
        .await
        .expect("failed to bind listen address");
    info!("server listening on http://{}", args.listen);
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .expect("server exited unexpectedly");
}
