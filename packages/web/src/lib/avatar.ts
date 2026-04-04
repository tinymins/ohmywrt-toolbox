/**
 * Resolve a storage key (e.g. "avatars/1234.jpg") to a full URL.
 * Uses the Rust server's /storage/{key} endpoint.
 * Returns undefined if key is empty/nullish.
 */

import { storageUrl } from "@/lib/storage-url";

export const resolveAvatarUrl = (
  key: string | null | undefined,
): string | undefined => {
  if (!key) return undefined;
  return storageUrl(key);
};
