/**
 * 订阅源内存缓存
 *
 * 缓存上游订阅地址的 HTTP 响应，避免频繁拉取导致被上游封禁。
 * 同一个 URL 在不同订阅中共享缓存条目。
 * 进程重启后缓存自动清空。
 */

export interface SubscriptionCacheEntry {
  /** 响应体文本 */
  text: string;
  /** 关键响应头 */
  headers: Record<string, string>;
  /** HTTP 状态码 */
  status: number;
  /** 缓存写入时间戳 (ms) */
  cachedAt: number;
}

class SubscriptionCache {
  private cache = new Map<string, SubscriptionCacheEntry>();

  /**
   * 尝试获取缓存条目
   * @param url 上游订阅地址
   * @param ttlMinutes 缓存有效期（分钟），0 或 null 表示不使用缓存
   * @returns 命中的缓存条目，或 null
   */
  get(
    url: string,
    ttlMinutes: number | null | undefined,
  ): SubscriptionCacheEntry | null {
    if (!ttlMinutes || ttlMinutes <= 0) return null;

    const entry = this.cache.get(url);
    if (!entry) return null;

    const ttlMs = ttlMinutes * 60 * 1000;
    if (Date.now() - entry.cachedAt > ttlMs) {
      // 已过期，移除
      this.cache.delete(url);
      return null;
    }

    return entry;
  }

  /**
   * 写入缓存条目
   */
  set(url: string, entry: Omit<SubscriptionCacheEntry, "cachedAt">): void {
    this.cache.set(url, { ...entry, cachedAt: Date.now() });
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存条目数量（调试用）
   */
  get size(): number {
    return this.cache.size;
  }
}

/** 全局单例 */
export const subscriptionCache = new SubscriptionCache();
