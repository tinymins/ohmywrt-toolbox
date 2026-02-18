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
}

/**
 * Dashboard 菜单配置
 * 支持多级嵌套结构
 */
export const menuConfig: MenuItemConfig[] = [
  {
    key: "workbench",
    labelKey: "workbench",
    routeSuffix: "",
  },
  {
    key: "requirements",
    labelKey: "requirements",
    routeSuffix: "/test-requirements",
  },
  {
    key: "testPlan",
    labelKey: "testPlan",
    routeSuffix: "/test-plan",
  },
  {
    key: "testDesign",
    labelKey: "testDesign",
    routeSuffix: null,
    children: [
      {
        key: "caseLibrary",
        labelKey: "testDesign.caseLibrary",
        routeSuffix: "/test-design",
      },
      {
        key: "caseReview",
        labelKey: "testDesign.caseReview",
        routeSuffix: "/test-design/review",
      },
      {
        key: "dataManagement",
        labelKey: "testDesign.dataManagement",
        routeSuffix: null,
        children: [
          {
            key: "testData",
            labelKey: "testDesign.dataManagement.testData",
            routeSuffix: "/test-design/data/test-data",
          },
          {
            key: "mockData",
            labelKey: "testDesign.dataManagement.mockData",
            routeSuffix: "/test-design/data/mock-data",
          },
        ],
      },
    ],
  },
  {
    key: "execution",
    labelKey: "execution",
    routeSuffix: null,
    children: [
      {
        key: "executionCenter",
        labelKey: "execution.center",
        routeSuffix: "/execution",
      },
      {
        key: "executionHistory",
        labelKey: "execution.history",
        routeSuffix: "/execution/history",
      },
    ],
  },
  {
    key: "defects",
    labelKey: "defects",
    routeSuffix: "/defects",
  },
  {
    key: "reports",
    labelKey: "reports",
    routeSuffix: "/reports",
  },
  {
    key: "automation",
    labelKey: "automation",
    routeSuffix: "/automation",
  },
  {
    key: "settings",
    labelKey: "settings",
    routeSuffix: "/settings",
  },
  {
    key: "todolist",
    labelKey: "todolist",
    routeSuffix: "/todulist",
  },
];

/**
 * 获取所有叶子节点的路由后缀（用于路由匹配）
 * @deprecated 使用 getRouteFromKey 或 findMenuItemByPath 代替
 */
export const menuRouteSuffixes = [
  "", // 工作台
  "/proxy", // Proxy 订阅管理
  "/settings", // 系统设置（放最后）
];

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

      // 检查当前项是否匹配
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

      // 递归检查子项
      if (item.children) {
        const found = findKeys(item.children, currentKeys);
        if (found) return found;
      }
    }
    return null;
  };

  return findKeys(menuConfig) ?? ["workbench"];
}

/**
 * 获取需要默认展开的子菜单 keys
 */
export function getDefaultOpenKeys(selectedKeys: string[]): string[] {
  if (selectedKeys.length <= 1) return [];
  // 返回除最后一个 key 外的所有父级 key
  return selectedKeys.slice(0, -1);
}
