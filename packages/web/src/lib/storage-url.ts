/**
 * Storage URL helper — resolve a storage key to an accessible URL.
 *
 * - Dev mode: proxied through Vite → `http://localhost:5678/storage/{key}`
 * - Prod mode: same-origin → `/storage/{key}`
 */

import { rustUrl } from "@/lib/rust-api-runtime";

export function storageUrl(key: string): string {
  return rustUrl(`/storage/${key}`);
}
