import type { MenuProps } from "@acme/components";
import {
  ControlOutlined,
  DashboardOutlined,
  FolderOpenOutlined,
  Menu,
} from "@acme/components";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks";
import {
  filterMenuByRole,
  findMenuKeysByPath,
  getDefaultOpenKeys,
  getRouteFromKey,
  type MenuItemConfig,
  menuConfig,
} from "./nav-config";

const iconMap: Record<string, ReactNode> = {
  dashboard: <DashboardOutlined />,
  folderOpen: <FolderOpenOutlined />,
  settings: <ControlOutlined />,
};

export default function SidebarNav() {
  const { workspace } = useParams<{ workspace: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const basePath = `/dashboard/${workspace}`;

  const stripEmoji = (text: string) =>
    text.replace(
      /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F)+\s*/u,
      "",
    );

  const buildMenuItems = (items: MenuItemConfig[]): MenuProps["items"] => {
    return items.map((item) => {
      const getLabel = (labelKey: string): string => {
        const nestedKey = `dashboard.menu.${labelKey}._`;
        const directKey = `dashboard.menu.${labelKey}`;
        const nestedLabel = t(nestedKey);
        if (nestedLabel !== nestedKey) {
          return nestedLabel;
        }
        return t(directKey);
      };

      const label = stripEmoji(getLabel(item.labelKey));
      const icon = item.icon ? iconMap[item.icon] : undefined;

      if (item.children && item.children.length > 0) {
        return {
          key: item.key,
          label,
          icon,
          children: buildMenuItems(item.children),
        };
      }

      return { key: item.key, label, icon };
    });
  };

  const filteredMenuConfig = useMemo(
    () => filterMenuByRole(menuConfig, user?.role),
    [user?.role],
  );

  const menuItemConfigs = buildMenuItems(filteredMenuConfig);

  const matchedKeys = useMemo(
    () => findMenuKeysByPath(location.pathname, basePath),
    [location.pathname, basePath],
  );

  const selectedKeys = useMemo(
    () => (matchedKeys.length > 0 ? [matchedKeys[matchedKeys.length - 1]] : []),
    [matchedKeys],
  );

  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    getDefaultOpenKeys(matchedKeys),
  );

  useEffect(() => {
    const defaultOpenKeys = getDefaultOpenKeys(matchedKeys);
    setOpenKeys((prev) => {
      const newKeys = new Set([...prev, ...defaultOpenKeys]);
      return Array.from(newKeys);
    });
  }, [matchedKeys]);

  const handleMenuClick = (key: string) => {
    const routeSuffix = getRouteFromKey(key);
    if (routeSuffix !== null) {
      navigate(`${basePath}${routeSuffix}`);
    }
  };

  return (
    <Menu
      mode="inline"
      items={menuItemConfigs}
      selectedKeys={selectedKeys}
      openKeys={openKeys}
      onOpenChange={setOpenKeys}
      onClick={({ key }) => handleMenuClick(key)}
      className="border-none bg-transparent"
      style={{ borderInlineEnd: "none" }}
    />
  );
}
