import type { DnsConfig, DnsSharedConfig } from "@acme/types";
import type { ProxyGroup, ProxyRuleProvidersList } from "@acme/types";
import { parse as parseJsonc } from "jsonc-parser";

export const DEFAULT_GROUPS: ProxyGroup[] = [
  { name: "🔰 国外流量", type: "select", proxies: ["🚀 直接连接"] },
  {
    name: "🏳️‍🌈 Google",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "✈️ Telegram",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🎬 Youtube",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🎬 TikTok",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "🎬 Netflix",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🎬 PTTracker",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "👽 Reddit",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🍎 苹果APNs",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "🍎 苹果服务",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "🪟 Microsoft",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  { name: "🎮 Steam", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  {
    name: "🎮 SteamContent",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "🎮 SeasunGame",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "🎮 Discord",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🤖 ChatGPT-IOS",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  { name: "🤖 AI", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  {
    name: "🐙 GitHub",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🪙 Crypto",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
  },
  {
    name: "🛡️ 正版验证拦截",
    type: "select",
    proxies: ["REJECT", "🚀 直接连接", "🔰 国外流量"],
  },
  {
    name: "🧹 秋风广告规则 AWAvenue",
    type: "select",
    proxies: ["🚀 直接连接", "🔰 国外流量", "REJECT"],
  },
  { name: "🚀 直接连接", type: "select", proxies: ["DIRECT"], readonly: true },
  {
    name: "💊 广告合集",
    type: "select",
    proxies: ["DIRECT", "REJECT"],
    readonly: true,
  },
  {
    name: "⚓️ 其他流量",
    type: "select",
    proxies: ["🔰 国外流量", "🚀 直接连接"],
    readonly: true,
  },
];

const SINGBOX_KEYWORD_MAP: Record<string, string> = {
  REJECT: "reject",
  DIRECT: "🚀 直接连接",
};

const SINGBOX_EXCLUDED_GROUPS = new Set<string>(["🚀 直接连接"]);

// Sing-box 输出沿用 Clash 分组，但需要调整内置关键字并禁用自循环 selector。
export const SB_DEFAULT_GROUPS: ProxyGroup[] = DEFAULT_GROUPS.filter(
  (group) => !SINGBOX_EXCLUDED_GROUPS.has(group.name),
).map((group) => ({
  ...group,
  proxies: group.proxies.map((proxy) => SINGBOX_KEYWORD_MAP[proxy] ?? proxy),
}));

export const DEFAULT_RULE_PROVIDERS: ProxyRuleProvidersList = {
  "🍎 苹果APNs": [
    {
      name: "AppleApns",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/AppleAPNs.yaml",
    },
  ],
  "🍎 苹果服务": [
    {
      name: "Apple",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Apple.yaml",
    },
    {
      name: "AppleTV",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/Apple%20TV.yaml",
    },
    {
      name: "AppleMusic",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/Apple%20Music.yaml",
    },
  ],
  "🪟 Microsoft": [
    {
      name: "Microsoft",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Microsoft.yaml",
    },
  ],
  "👽 Reddit": [
    {
      name: "Reddit",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Reddit/Reddit_No_Resolve.yaml",
    },
  ],
  "🤖 ChatGPT-IOS": [
    {
      name: "ChatGPT-IOS",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/chatgpt-ios.yaml",
    },
  ],
  "🤖 AI": [
    {
      name: "AI",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/AI%20Suite.yaml",
    },
  ],
  "🐙 GitHub": [
    {
      name: "GitHub",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/github.yaml",
    },
  ],
  "🪙 Crypto": [
    {
      name: "Crypto",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Crypto.yaml",
    },
  ],
  "🎬 Youtube": [
    {
      name: "Youtube",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/YouTube.yaml",
    },
  ],
  "🎬 TikTok": [
    {
      name: "TikTok",
      url: "https://raw.githubusercontent.com/Z-Siqi/Clash-for-Windows_Rule/refs/heads/main/Rule/TikTok",
    },
  ],
  "🎬 Netflix": [
    {
      name: "Netflix",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/Netflix.yaml",
    },
  ],
  "🎬 PTTracker": [
    {
      name: "PTTracker",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/PTTracker.yaml",
    },
  ],
  "🎮 Steam": [
    {
      name: "Steam",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Steam.yaml",
    },
  ],
  "🎮 SteamContent": [
    {
      name: "SteamContent",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/SteamContent.yaml",
    },
  ],
  "🎮 SeasunGame": [
    {
      name: "SeasunGame",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/SeasunGame.yaml",
    },
  ],
  "🎮 Discord": [
    {
      name: "Discord",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Discord.yaml",
    },
  ],
  "✈️ Telegram": [
    {
      name: "Telegram",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Telegram.yaml",
    },
  ],
  "🏳️‍🌈 Google": [
    {
      name: "GoogleCIDRv2",
      url: "https://vercel.williamchan.me/api/google-ips",
    },
  ],
  "🛡️ 正版验证拦截": [
    {
      name: "AdobeUnlicensed",
      url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/AdobeUnlicensed.yaml",
    },
  ],
  "🧹 秋风广告规则 AWAvenue": [
    {
      name: "AWAvenueAD",
      url: "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Clash.yaml",
    },
  ],
  "💊 广告合集": [
    {
      name: "AD",
      url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/AdBlock.yaml",
    },
  ],
};

/** 默认过滤器 */
export const DEFAULT_FILTER: string[] = ["官网", "客服", "qq群"];

/** 默认自定义规则 */
export const DEFAULT_CUSTOM_CONFIG: string[] = [];

/** 默认 DNS 共享配置（表单设置） */
export const DEFAULT_DNS_SHARED: Required<DnsSharedConfig> = {
  localDns: "127.0.0.1",
  localDnsPort: 53,
  fakeipIpv4Range: "198.18.0.0/15",
  fakeipIpv6Range: "fc00::/18",
  fakeipEnabled: true,
  fakeipTtl: 300,
  dnsListenPort: 1053,
  tproxyPort: 7893,
  rejectHttps: true,
  cnDomainLocalDns: true,
  clashApiPort: 9999,
  clashApiSecret: "123456",
  clashApiUiPath: "/etc/sb/ui",
};

/** DNS 有效使用格式 */
export type DnsOverrideKey = "singbox" | "singboxV12" | "clash" | "clashMeta";

export interface ResolvedDnsConfig {
  shared: Required<DnsSharedConfig>;
  overrides: Record<DnsOverrideKey, Record<string, unknown> | undefined>;
}

/** 解析并合并 DNS 配置 */
export const resolveDnsConfig = (
  useSystem: boolean,
  dnsConfigJsonc: string | null,
): ResolvedDnsConfig => {
  const defaults: ResolvedDnsConfig = {
    shared: DEFAULT_DNS_SHARED,
    overrides: { singbox: undefined, singboxV12: undefined, clash: undefined, clashMeta: undefined },
  };
  if (useSystem || !dnsConfigJsonc) return defaults;
  try {
    const parsed = parseJsonc(dnsConfigJsonc) as DnsConfig | null;
    if (!parsed || typeof parsed !== "object") return defaults;
    return {
      shared: { ...DEFAULT_DNS_SHARED, ...(parsed.shared ?? {}) },
      overrides: {
        singbox: parsed.overrides?.singbox ?? undefined,
        singboxV12: parsed.overrides?.singboxV12 ?? undefined,
        clash: parsed.overrides?.clash ?? undefined,
        clashMeta: parsed.overrides?.clashMeta ?? undefined,
      },
    };
  } catch {
    return defaults;
  }
};

/** 国旗映射表（中文名 → 旗帜 emoji） */
export const FLAG_MAP: Record<string, string> = {
  // ── 东亚 ──
  中国: "🇨🇳",
  香港: "🇭🇰",
  台湾: "🇹🇼",
  澳门: "🇲🇴",
  日本: "🇯🇵",
  韩国: "🇰🇷",
  朝鲜: "🇰🇵",
  蒙古: "🇲🇳",

  // ── 东南亚 ──
  新加坡: "🇸🇬",
  泰国: "🇹🇭",
  越南: "🇻🇳",
  马来西亚: "🇲🇾",
  印度尼西亚: "🇮🇩",
  菲律宾: "🇵🇭",
  柬埔寨: "🇰🇭",
  缅甸: "🇲🇲",
  老挝: "🇱🇦",
  文莱: "🇧🇳",
  东帝汶: "🇹🇱",

  // ── 南亚 ──
  印度: "🇮🇳",
  巴基斯坦: "🇵🇰",
  孟加拉: "🇧🇩",
  斯里兰卡: "🇱🇰",
  尼泊尔: "🇳🇵",
  马尔代夫: "🇲🇻",

  // ── 中亚 / 西亚 ──
  哈萨克斯坦: "🇰🇿",
  乌兹别克斯坦: "🇺🇿",
  土库曼斯坦: "🇹🇲",
  吉尔吉斯斯坦: "🇰🇬",
  塔吉克斯坦: "🇹🇯",
  阿富汗: "🇦🇫",
  伊朗: "🇮🇷",
  伊拉克: "🇮🇶",
  沙特阿拉伯: "🇸🇦",
  沙特: "🇸🇦",
  阿联酋: "🇦🇪",
  迪拜: "🇦🇪",
  卡塔尔: "🇶🇦",
  科威特: "🇰🇼",
  巴林: "🇧🇭",
  阿曼: "🇴🇲",
  也门: "🇾🇪",
  以色列: "🇮🇱",
  黎巴嫩: "🇱🇧",
  约旦: "🇯🇴",
  叙利亚: "🇸🇾",
  格鲁吉亚: "🇬🇪",
  亚美尼亚: "🇦🇲",
  阿塞拜疆: "🇦🇿",
  塞浦路斯: "🇨🇾",
  土耳其: "🇹🇷",

  // ── 欧洲 ──
  英国: "🇬🇧",
  法国: "🇫🇷",
  德国: "🇩🇪",
  意大利: "🇮🇹",
  西班牙: "🇪🇸",
  葡萄牙: "🇵🇹",
  荷兰: "🇳🇱",
  比利时: "🇧🇪",
  卢森堡: "🇱🇺",
  瑞士: "🇨🇭",
  奥地利: "🇦🇹",
  爱尔兰: "🇮🇪",
  冰岛: "🇮🇸",
  丹麦: "🇩🇰",
  挪威: "🇳🇴",
  瑞典: "🇸🇪",
  芬兰: "🇫🇮",
  波兰: "🇵🇱",
  捷克: "🇨🇿",
  斯洛伐克: "🇸🇰",
  匈牙利: "🇭🇺",
  罗马尼亚: "🇷🇴",
  保加利亚: "🇧🇬",
  希腊: "🇬🇷",
  克罗地亚: "🇭🇷",
  塞尔维亚: "🇷🇸",
  斯洛文尼亚: "🇸🇮",
  波黑: "🇧🇦",
  北马其顿: "🇲🇰",
  黑山: "🇲🇪",
  阿尔巴尼亚: "🇦🇱",
  爱沙尼亚: "🇪🇪",
  拉脱维亚: "🇱🇻",
  立陶宛: "🇱🇹",
  乌克兰: "🇺🇦",
  白俄罗斯: "🇧🇾",
  摩尔多瓦: "🇲🇩",
  俄罗斯: "🇷🇺",
  马耳他: "🇲🇹",
  梵蒂冈: "🇻🇦",
  摩纳哥: "🇲🇨",
  列支敦士登: "🇱🇮",
  安道尔: "🇦🇩",
  圣马力诺: "🇸🇲",

  // ── 北美洲 ──
  美国: "🇺🇸",
  加拿大: "🇨🇦",
  墨西哥: "🇲🇽",
  古巴: "🇨🇺",
  巴拿马: "🇵🇦",
  哥斯达黎加: "🇨🇷",
  危地马拉: "🇬🇹",
  牙买加: "🇯🇲",
  波多黎各: "🇵🇷",
  多米尼加: "🇩🇴",
  巴哈马: "🇧🇸",

  // ── 南美洲 ──
  巴西: "🇧🇷",
  阿根廷: "🇦🇷",
  智利: "🇨🇱",
  哥伦比亚: "🇨🇴",
  秘鲁: "🇵🇪",
  委内瑞拉: "🇻🇪",
  厄瓜多尔: "🇪🇨",
  乌拉圭: "🇺🇾",
  巴拉圭: "🇵🇾",
  玻利维亚: "🇧🇴",

  // ── 非洲 ──
  南非: "🇿🇦",
  埃及: "🇪🇬",
  尼日利亚: "🇳🇬",
  肯尼亚: "🇰🇪",
  摩洛哥: "🇲🇦",
  突尼斯: "🇹🇳",
  阿尔及利亚: "🇩🇿",
  利比亚: "🇱🇾",
  埃塞俄比亚: "🇪🇹",
  坦桑尼亚: "🇹🇿",
  加纳: "🇬🇭",
  索马里: "🇸🇴",
  马达加斯加: "🇲🇬",
  毛里求斯: "🇲🇺",
  塞舌尔: "🇸🇨",

  // ── 大洋洲 ──
  澳大利亚: "🇦🇺",
  新西兰: "🇳🇿",
  斐济: "🇫🇯",
  关岛: "🇬🇺",

  // ── 其他 / 特殊地区 ──
  南极: "🇦🇶",
};

/** 匹配国/地区旗帜 emoji（由两个 Regional Indicator 字符组成） */
const FLAG_EMOJI_RE = /[\u{1F1E0}-\u{1F1FF}]{2}/gu;

/** 为节点名称添加国旗图标，已有旗帜时提取到最前面并去重 */
export const appendIcon = (name: string): string => {
  // 提取名称中已有的所有旗帜 emoji
  const existingFlags = name.match(FLAG_EMOJI_RE);

  if (existingFlags && existingFlags.length > 0) {
    // 去掉名称中所有旗帜 emoji 及其后可能跟随的空格
    const stripped = name.replace(/[\u{1F1E0}-\u{1F1FF}]{2}\s*/gu, "").trim();
    // 取第一个旗帜，放到最前面
    return `${existingFlags[0]} ${stripped}`;
  }

  // 没有旗帜 emoji，按关键词查找并添加
  const flag = Object.keys(FLAG_MAP).find((key) => name.includes(key));
  if (flag && flag in FLAG_MAP) {
    return `${FLAG_MAP[flag]} ${name}`;
  }
  return name;
};
