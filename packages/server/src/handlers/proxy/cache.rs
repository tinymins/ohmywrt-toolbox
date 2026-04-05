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

/// Retrieve a cached subscription response if it hasn't expired.
/// `ttl_minutes` ≤ 0 means no caching.
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

/// Store a subscription response in cache.
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
