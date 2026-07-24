/// Shared subscription fetch & parse utility.
///
/// Encapsulates the full fetch → parse → cache pipeline:
/// 1. In-memory cache hit (within TTL) with >0 nodes → return immediately
/// 2. HTTP fetch with auto-retry (up to `max_attempts`, default 3)
/// 3. Each success (>0 nodes) unconditionally writes to cache
/// 4. All attempts fail → fallback to cache ignoring TTL
/// 5. No fallback available → return None
use tracing::warn;

use super::cache;
use super::parser::parse_subscription;
use super::source_client::{SourceFetchMode, build_source_http_client};
use super::types::ClashProxy;

pub struct FetchResult {
    pub text: String,
    pub proxies: Vec<ClashProxy>,
    pub status: Option<u16>,
    pub cached: bool,
}

/// Fetch and parse a subscription URL with retry + cache fallback.
///
/// - `ua`: User-Agent to use for HTTP requests and cache key
/// - `max_attempts`: total attempts including the first (default 3)
/// - Returns `None` when all attempts produce 0 nodes AND no fallback exists.
pub async fn fetch_and_parse(
    url: &str,
    ua: &str,
    cache_ttl_minutes: i32,
    max_attempts: u32,
    fetch_mode: SourceFetchMode,
) -> Option<FetchResult> {
    let cache_partition = fetch_mode.as_str();

    // 1. Try in-memory cache (TTL-aware)
    if let Some(cached_text) = cache::get(url, ua, cache_partition, cache_ttl_minutes) {
        let proxies = parse_subscription(&cached_text);
        if !proxies.is_empty() {
            return Some(FetchResult {
                text: cached_text,
                proxies,
                status: None,
                cached: true,
            });
        }
        // Cache hit but 0 nodes → treat as stale, re-fetch below
    }

    // 2. Fetch with retry
    let client = match build_source_http_client(fetch_mode, false) {
        Ok(source_client) => source_client.client,
        Err(error) => {
            warn!(
                "[fetchSubscription] {} route {} is unavailable: {}",
                url, cache_partition, error
            );
            return fallback_result(url, ua, cache_partition, max_attempts);
        }
    };
    for attempt in 1..=max_attempts {
        match client.get(url).header("User-Agent", ua).send().await {
            Ok(resp) => {
                let status = resp.status().as_u16();
                match resp.text().await {
                    Ok(text) => {
                        let proxies = parse_subscription(&text);
                        if !proxies.is_empty() {
                            // Success → unconditionally write to cache
                            cache::set(url, ua, cache_partition, text.clone(), status);
                            return Some(FetchResult {
                                text,
                                proxies,
                                status: Some(status),
                                cached: false,
                            });
                        }
                        // 0 nodes → warn and retry
                        if attempt < max_attempts {
                            warn!(
                                "[fetchSubscription] {} attempt {}/{} parsed 0 nodes, retrying...",
                                url, attempt, max_attempts
                            );
                        }
                    }
                    Err(e) => {
                        if attempt < max_attempts {
                            warn!(
                                "[fetchSubscription] {} attempt {}/{} read error: {}, retrying...",
                                url, attempt, max_attempts, e
                            );
                        }
                    }
                }
            }
            Err(e) => {
                if attempt < max_attempts {
                    warn!(
                        "[fetchSubscription] {} attempt {}/{} request failed: {}, retrying...",
                        url, attempt, max_attempts, e
                    );
                }
            }
        }
    }

    // 3. All attempts failed → fallback to cache ignoring TTL
    fallback_result(url, ua, cache_partition, max_attempts)
}

fn fallback_result(
    url: &str,
    ua: &str,
    cache_partition: &str,
    max_attempts: u32,
) -> Option<FetchResult> {
    if let Some(fallback_text) = cache::get_fallback(url, ua, cache_partition) {
        let proxies = parse_subscription(&fallback_text);
        if !proxies.is_empty() {
            warn!(
                "[fetchSubscription] {} all {} attempts failed, using cache fallback ({} nodes)",
                url,
                max_attempts,
                proxies.len()
            );
            return Some(FetchResult {
                text: fallback_text,
                proxies,
                status: None,
                cached: true,
            });
        }
    }

    warn!(
        "[fetchSubscription] {} all {} attempts failed and no usable cache, giving up",
        url, max_attempts
    );
    None
}
