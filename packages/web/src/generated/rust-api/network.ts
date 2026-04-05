import { createQuery } from "@/lib/rust-api-runtime";

// ─── Types ───

export interface NetworkListResponse {
  count: number;
  items: string[];
}

// ─── API ───

export const networkApi = {
  geoipCn: createQuery<void, NetworkListResponse>({
    path: "/api/public/network/geoip/cn",
  }),
  geositeCn: createQuery<void, NetworkListResponse>({
    path: "/api/public/network/geosite/cn",
  }),
};
