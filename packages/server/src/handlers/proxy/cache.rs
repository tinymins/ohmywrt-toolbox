/// Subscription source in-memory cache.
///
/// Single HashMap storage with separate TTL tracking:
/// - `get(url, ttl)`: TTL-aware read, returns `None` when expired
/// - `get_fallback(url)`: Ignores TTL, returns last written data (fallback)
/// - `set(url, entry)`: Unconditionally writes/updates cache data
///
/// When an upstream provider is temporarily unavailable (all fetch attempts
/// return 0 nodes), `get_fallback` provides the last known good data.
/// Cache is keyed by (URL, UA) pair — same URL with different User-Agents
/// can return different content from providers.
/// Cleared automatically on process restart.
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

struct CacheEntry {
    text: String,
    #[allow(dead_code)]
    status: u16,
    cached_at: Instant,
}

static CACHE: std::sync::LazyLock<Mutex<HashMap<String, CacheEntry>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

/// Build a cache key from URL, User-Agent, and fetch route.
fn cache_key(url: &str, ua: &str, fetch_mode: &str) -> String {
    format!("{url}\0{ua}\0{fetch_mode}")
}

/// TTL-aware cache read.
/// Returns the cached text if within TTL; `None` if expired or absent.
/// Does NOT delete expired entries (needed for `get_fallback`).
pub fn get(url: &str, ua: &str, fetch_mode: &str, ttl_minutes: i32) -> Option<String> {
    if ttl_minutes <= 0 {
        return None;
    }
    let key = cache_key(url, ua, fetch_mode);
    let lock = CACHE.lock().ok()?;
    let entry = lock.get(&key)?;
    let elapsed = entry.cached_at.elapsed();
    if elapsed.as_secs() < (ttl_minutes as u64) * 60 {
        Some(entry.text.clone())
    } else {
        None
    }
}

/// Fallback read that ignores TTL (returns most recent write regardless of age).
pub fn get_fallback(url: &str, ua: &str, fetch_mode: &str) -> Option<String> {
    let key = cache_key(url, ua, fetch_mode);
    let lock = CACHE.lock().ok()?;
    lock.get(&key).map(|e| e.text.clone())
}

/// Unconditionally write/update a cache entry (updates both TTL cache and fallback data).
pub fn set(url: &str, ua: &str, fetch_mode: &str, text: String, status: u16) {
    if let Ok(mut lock) = CACHE.lock() {
        lock.insert(
            cache_key(url, ua, fetch_mode),
            CacheEntry {
                text,
                status,
                cached_at: Instant::now(),
            },
        );
    }
}

/// Remove a single URL from cache.
pub fn remove(url: &str) {
    if let Ok(mut lock) = CACHE.lock() {
        lock.remove(url);
    }
}

/// Clear all cached entries.
pub fn clear_all() {
    if let Ok(mut lock) = CACHE.lock() {
        lock.clear();
    }
}

/// Remove expired entries from cache (optional cleanup).
#[allow(dead_code)]
pub fn cleanup(max_age_minutes: i32) {
    if let Ok(mut lock) = CACHE.lock() {
        let cutoff = (max_age_minutes as u64) * 60;
        lock.retain(|_, entry| entry.cached_at.elapsed().as_secs() < cutoff);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fetch_routes_have_separate_cache_entries() {
        clear_all();
        set(
            "https://example.com/sub",
            "clash.meta",
            "auto",
            "auto-response".to_string(),
            200,
        );

        assert_eq!(
            get("https://example.com/sub", "clash.meta", "auto", 60).as_deref(),
            Some("auto-response")
        );
        assert_eq!(
            get(
                "https://example.com/sub",
                "clash.meta",
                "domestic-direct",
                60,
            ),
            None
        );
        clear_all();
    }
}
