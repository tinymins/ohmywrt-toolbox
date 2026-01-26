import { Injectable, Logger } from "@nestjs/common";

// 简单的内存缓存
const cache = new Map<string, { value: string; expireAt: number }>();

const CACHE_TTL = 86400 * 1000; // 24 小时

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  /** 获取中国 IPv4 CIDR 列表 */
  async getGeoIpCn(): Promise<string> {
    const cacheKey = "GEO_IP_CN";
    const cached = cache.get(cacheKey);
    if (cached && cached.expireAt > Date.now()) {
      return cached.value;
    }

    try {
      const [response1, response2] = await Promise.all([
        fetch("http://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest"),
        fetch("https://raw.githubusercontent.com/ChanthMiao/China-IPv4-List/release/cn.txt")
      ]);

      const data1 = await response1.text();
      const list: string[] = [];

      // 解析 APNIC 数据
      const lines = data1.split("\n");
      for (const line of lines) {
        if (line.includes("CN|ipv4")) {
          const parts = line.split("|");
          const ip = parts[3];
          const count = parts[4];
          const cidr = 32 - Math.log(Number(count)) / Math.log(2);
          list.push(`${ip}/${Math.floor(cidr)}`);
        }
      }

      // 合并额外的 CN 列表
      const data2 = await response2.text();
      const lines2 = data2.split("\n");
      for (const line of lines2) {
        if (line && !list.includes(line)) {
          list.push(line);
        }
      }

      // 按 IP 排序
      const sorted = list.filter(Boolean).sort((a, b) => {
        const ipa = a.split("/")[0];
        const ipb = b.split("/")[0];
        const partsa = ipa.split(".").map((x) => Number(x));
        const partsb = ipb.split(".").map((x) => Number(x));
        for (let i = 0; i < 4; i++) {
          if (partsa[i] < partsb[i]) return -1;
          if (partsa[i] > partsb[i]) return 1;
        }
        return 0;
      });

      const value = sorted.join("\n");
      cache.set(cacheKey, { value, expireAt: Date.now() + CACHE_TTL });
      return value;
    } catch (error) {
      this.logger.error("Error fetching GeoIP CN data:", error);
      throw error;
    }
  }

  /** 获取中国域名列表（用于 DNS 分流） */
  async getGeoSiteCn(): Promise<string> {
    const cacheKey = "GEO_SITE_CN";
    const cached = cache.get(cacheKey);
    if (cached && cached.expireAt > Date.now()) {
      return cached.value;
    }

    const sites = [
      "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/ChinaMaxNoIP/ChinaMaxNoIP_Domain.txt",
      "https://raw.githubusercontent.com/Loyalsoldier/v2ray-rules-dat/release/apple-cn.txt",
      "https://raw.githubusercontent.com/Loyalsoldier/v2ray-rules-dat/release/china-list.txt",
      "https://raw.githubusercontent.com/Loyalsoldier/v2ray-rules-dat/release/google-cn.txt",
      "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/China/China_Domain.list",
      "https://raw.githubusercontent.com/v2fly/domain-list-community/release/cn.txt"
    ];

    const domains: Record<string, true> = { cn: true, lan: true };

    const results = await Promise.all(
      sites.map((site) => fetch(site).then((response) => response.text()).catch(() => ""))
    );

    for (const item of results) {
      const arr = item.split("\n");
      for (const line of arr) {
        if (line && !line.startsWith("#")) {
          // 提取域名
          const domainMatch = line.match(/([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}/);
          if (domainMatch) {
            domains[domainMatch[0]] = true;
          }
        }
      }
    }

    const result = `127.0.0.1:1053\n[/${Object.keys(domains).sort().join("/")}]/127.0.0.1`;
    cache.set(cacheKey, { value: result, expireAt: Date.now() + CACHE_TTL });
    return result;
  }
}

export const networkService = new NetworkService();
