import type { ReactNode } from "react";

/**
 * 菜单项配置类型
 * 支持一级、二级、三级菜单结构
 */
export interface MenuItemConfig {
  /** 唯一标识 key */
  key: string;
  /** i18n 翻译路径 (相对于 dashboard.menu) */
  labelKey: string;
  /** 路由后缀（相对于 /dashboard 或 /dashboard/:workspace），null 表示仅作为父菜单 */
  routeSuffix: string | null;
  /** 子菜单项 */
  children?: MenuItemConfig[];
  /** 显示图标 (可选) */
  icon?: string;
  /** 需要的最低角色 (admin = admin|superadmin, 不设置 = 所有已登录用户) */
  requiredRole?: "admin" | "superadmin";
}

/**
 * Dashboard 菜单配置
 * 支持多级嵌套结构
 */
export const menuConfig: MenuItemConfig[] = [
  {
    key: "overview",
    labelKey: "overview",
    routeSuffix: "",
    icon: "dashboard",
  },
  {
    key: "toolsGroup",
    labelKey: "toolsGroup",
    routeSuffix: null,
    icon: "wrench",
    children: [
      {
        key: "proxy",
        labelKey: "toolsGroup.proxy",
        routeSuffix: "/proxy",
        icon: "globe",
      },
      {
        key: "network",
        labelKey: "toolsGroup.network",
        routeSuffix: "/network",
        icon: "network",
      },
    ],
  },
  {
    key: "settingsGroup",
    labelKey: "settingsGroup",
    routeSuffix: null,
    icon: "settings",
    children: [
      {
        key: "generalSettings",
        labelKey: "settingsGroup.generalSettings",
        routeSuffix: "/settings",
      },
      {
        key: "adminSettings",
        labelKey: "settingsGroup.adminSettings",
        routeSuffix: "/admin",
        requiredRole: "admin",
      },
    ],
  },
];

/**
 * Icon string → ReactNode mapping, constructed by sidebar component
 */
export type IconMap = Record<string, ReactNode>;

/**
 * 根据菜单 key 获取路由后缀
 */
export function getRouteFromKey(key: string): string | null {
  const findRoute = (items: MenuItemConfig[]): string | null => {
    for (const item of items) {
      if (item.key === key) {
        return item.routeSuffix;
      }
      if (item.children) {
        const found = findRoute(item.children);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return findRoute(menuConfig);
}

/**
 * 根据路径查找匹配的菜单项 key（包括父级 key 链）
 * 返回 [parentKey, childKey, grandchildKey] 格式
 */
export function findMenuKeysByPath(path: string, basePath: string): string[] {
  const findKeys = (
    items: MenuItemConfig[],
    parentKeys: string[] = [],
  ): string[] | null => {
    for (const item of items) {
      const currentKeys = [...parentKeys, item.key];

      if (item.routeSuffix !== null) {
        const fullPath = `${basePath}${item.routeSuffix}`;
        if (
          path === fullPath ||
          (item.routeSuffix === "" &&
            (path === basePath || path === `${basePath}/`))
        ) {
          return currentKeys;
        }
      }

      if (item.children) {
        const found = findKeys(item.children, currentKeys);
        if (found) return found;
      }
    }
    return null;
  };

  return findKeys(menuConfig) ?? ["overview"];
}

/**
 * 获取需要默认展开的子菜单 keys
 */
export function getDefaultOpenKeys(selectedKeys: string[]): string[] {
  if (selectedKeys.length <= 1) return [];
  return selectedKeys.slice(0, -1);
}

const ROLE_LEVEL: Record<string, number> = {
  user: 0,
  admin: 1,
  superadmin: 2,
};

/**
 * 按用户角色过滤菜单项
 * 移除当前角色无权访问的菜单项，自动清理空的父菜单
 */
export function filterMenuByRole(
  items: MenuItemConfig[],
  userRole: string | undefined,
): MenuItemConfig[] {
  const level = ROLE_LEVEL[userRole ?? "user"] ?? 0;

  return items.reduce<MenuItemConfig[]>((acc, item) => {
    const required = ROLE_LEVEL[item.requiredRole ?? "user"] ?? 0;
    if (level < required) return acc;

    if (item.children) {
      const filtered = filterMenuByRole(item.children, userRole);
      if (filtered.length === 0) return acc;
      acc.push({ ...item, children: filtered });
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

/** path → 中文名，由 menuConfig 派生，无需手动维护 */
export const PAGE_NAMES: Record<string, string> = (() => {
  const result: Record<string, string> = {};
  const collect = (items: MenuItemConfig[]) => {
    for (const item of items) {
      if (item.routeSuffix !== null) {
        const path = item.routeSuffix.replace(/^\//, "");
        result[path] = item.labelKey;
      }
      if (item.children) collect(item.children);
    }
  };
  collect(menuConfig);
  return result;
})();
