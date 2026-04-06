/// Subscription source in-memory cache.
///
/// Single HashMap storage with separate TTL tracking:
/// - `get(url, ttl)`: TTL-aware read, returns `None` when expired
/// - `get_fallback(url)`: Ignores TTL, returns last written data (fallback)
/// - `set(url, entry)`: Unconditionally writes/updates cache data
///
/// When an upstream provider is temporarily unavailable (all fetch attempts
/// return 0 nodes), `get_fallback` provides the last known good data.
/// Cache is shared across subscriptions for the same URL.
/// Cleared automatically on process restart.
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use once_cell::sync::Lazy;

struct CacheEntry {
    text: String,
    #[allow(dead_code)]
    status: u16,
    cached_at: Instant,
}

static CACHE: Lazy<Mutex<HashMap<String, CacheEntry>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// TTL-aware cache read.
/// Returns the cached text if within TTL; `None` if expired or absent.
/// Does NOT delete expired entries (needed for `get_fallback`).
pub fn get(url: &str, ttl_minutes: i32) -> Option<String> {
    if ttl_minutes <= 0 {
        return None;
    }
    let lock = CACHE.lock().ok()?;
    let entry = lock.get(url)?;
    let elapsed = entry.cached_at.elapsed();
    if elapsed.as_secs() < (ttl_minutes as u64) * 60 {
        Some(entry.text.clone())
    } else {
        None
    }
}

/// Fallback read that ignores TTL (returns most recent write regardless of age).
pub fn get_fallback(url: &str) -> Option<String> {
    let lock = CACHE.lock().ok()?;
    lock.get(url).map(|e| e.text.clone())
}

/// Unconditionally write/update a cache entry (updates both TTL cache and fallback data).
pub fn set(url: &str, text: String, status: u16) {
    if let Ok(mut lock) = CACHE.lock() {
        lock.insert(
            url.to_string(),
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
