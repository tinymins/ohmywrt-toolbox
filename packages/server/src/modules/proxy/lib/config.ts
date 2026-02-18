import type { ProxyGroup, ProxyRuleProvidersList } from "@acme/types";

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

/** 国旗映射表 */
export const FLAG_MAP: Record<string, string> = {
  香港: "🇭🇰",
  台湾: "🇹🇼",
  澳门: "🇲🇴",
  梵蒂冈: "🇻🇦",
  索马里: "🇸🇴",
  南极: "🇦🇶",
  爱尔兰: "🇮🇪",
  新加坡: "🇸🇬",
  荷兰: "🇳🇱",
  朝鲜: "🇰🇵",
  美国: "🇺🇸",
  日本: "🇯🇵",
  韩国: "🇰🇷",
  英国: "🇬🇧",
  法国: "🇫🇷",
  德国: "🇩🇪",
  意大利: "🇮🇹",
  西班牙: "🇪🇸",
  俄罗斯: "🇷🇺",
  加拿大: "🇨🇦",
  澳大利亚: "🇦🇺",
  巴西: "🇧🇷",
  印度: "🇮🇳",
  墨西哥: "🇲🇽",
  阿根廷: "🇦🇷",
  沙特阿拉伯: "🇸🇦",
  土耳其: "🇹🇷",
  印度尼西亚: "🇮🇩",
  瑞士: "🇨🇭",
};

/** 为节点名称添加国旗图标 */
export const appendIcon = (name: string): string => {
  const flag = Object.keys(FLAG_MAP).find((key) => name.includes(key));
  if (flag && flag in FLAG_MAP) {
    return `${FLAG_MAP[flag]} ${name}`;
  }
  return name;
};
