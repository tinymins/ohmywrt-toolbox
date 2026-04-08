use std::sync::Arc;
use std::time::Instant;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use tokio::sync::RwLock;

use crate::error::ApiResponse;
use crate::AppState;

// ─── Cache structures ───

struct CacheEntry {
    data: String,
    fetched_at: Instant,
}

static GEOIP_CACHE: std::sync::LazyLock<RwLock<Option<CacheEntry>>> = std::sync::LazyLock::new(|| RwLock::new(None));

static GEOSITE_CACHE: std::sync::LazyLock<RwLock<Option<CacheEntry>>> = std::sync::LazyLock::new(|| RwLock::new(None));

const CACHE_TTL_SECS: u64 = 24 * 60 * 60; // 24 hours

// ─── Fetch helpers ───

async fn fetch_geoip_cn() -> Result<String, String> {
    let primary_url =
        "https://raw.githubusercontent.com/17mon/china_ip_list/master/china_ip_list.txt";

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    match client.get(primary_url).send().await {
        Ok(resp) if resp.status().is_success() => {
            return resp
                .text()
                .await
                .map_err(|e| format!("Failed to read response: {e}"));
        }
        Ok(resp) => {
            tracing::warn!("Primary GeoIP source returned {}", resp.status());
        }
        Err(e) => {
            tracing::warn!("Primary GeoIP source failed: {e}");
        }
    }

    // Fallback: APNIC delegated data
    let apnic_url = "https://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest";
    let resp = client
        .get(apnic_url)
        .send()
        .await
        .map_err(|e| format!("APNIC fetch failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("APNIC returned status {}", resp.status()));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read APNIC response: {e}"))?;

    let mut cidrs = Vec::new();
    for line in text.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 5 && parts[1] == "CN" && parts[2] == "ipv4" {
            let ip = parts[3];
            let count: u32 = match parts[4].parse() {
                Ok(c) => c,
                Err(_) => continue,
            };
            // Convert count to CIDR prefix length
            let prefix = 32 - f64::from(count).log2() as u32;
            cidrs.push(format!("{ip}/{prefix}"));
        }
    }

    if cidrs.is_empty() {
        return Err("No CN IPv4 entries found in APNIC data".into());
    }

    Ok(cidrs.join("\n"))
}

async fn fetch_geosite_cn() -> Result<String, String> {
    let url =
        "https://raw.githubusercontent.com/Loyalsoldier/v2ray-rules-dat/release/direct-list.txt";

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("GeoSite fetch failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("GeoSite source returned status {}", resp.status()));
    }

    resp.text()
        .await
        .map_err(|e| format!("Failed to read GeoSite response: {e}"))
}

async fn get_cached_or_fetch(
    cache: &RwLock<Option<CacheEntry>>,
    fetcher: impl std::future::Future<Output = Result<String, String>>,
) -> Result<String, String> {
    // Check cache (read lock)
    {
        let guard = cache.read().await;
        if let Some(entry) = guard.as_ref()
            && entry.fetched_at.elapsed().as_secs() < CACHE_TTL_SECS {
                return Ok(entry.data.clone());
            }
    }

    // Cache miss or expired — fetch and update
    let data = fetcher.await?;
    {
        let mut guard = cache.write().await;
        *guard = Some(CacheEntry {
            data: data.clone(),
            fetched_at: Instant::now(),
        });
    }
    Ok(data)
}

// ─── Public handlers (no auth) ───

pub async fn geoip_cn(State(_state): State<Arc<AppState>>) -> Response {
    match get_cached_or_fetch(&GEOIP_CACHE, fetch_geoip_cn()).await {
        Ok(data) => {
            let lines: Vec<&str> = data.lines().filter(|l| !l.is_empty()).collect();
            Json(ApiResponse {
                success: true,
                data: Some(serde_json::json!({
                    "count": lines.len(),
                    "items": lines,
                })),
                error: None,
            })
            .into_response()
        }
        Err(msg) => {
            tracing::error!("Failed to fetch GeoIP CN data: {msg}");
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                error: Some(format!("Failed to fetch GeoIP data: {msg}")),
            })
            .into_response()
        }
    }
}

pub async fn geosite_cn(State(_state): State<Arc<AppState>>) -> Response {
    match get_cached_or_fetch(&GEOSITE_CACHE, fetch_geosite_cn()).await {
        Ok(data) => {
            let lines: Vec<&str> = data.lines().filter(|l| !l.is_empty()).collect();
            Json(ApiResponse {
                success: true,
                data: Some(serde_json::json!({
                    "count": lines.len(),
                    "items": lines,
                })),
                error: None,
            })
            .into_response()
        }
        Err(msg) => {
            tracing::error!("Failed to fetch GeoSite CN data: {msg}");
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                error: Some(format!("Failed to fetch GeoSite data: {msg}")),
            })
            .into_response()
        }
    }
}
