import type { User } from "@acme/types";
import {
  BulbOutlined,
  CloseOutlined,
  GlobalOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Drawer, Dropdown, Menu } from "antd";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { WorkspaceRedirectSkeleton } from "../../components/skeleton";
import { trpc } from "../../lib/trpc";
import type { LangMode, ThemeMode } from "../../lib/types";
import { LANG_NAMES } from "../../lib/types";
import { SystemSettingsModal, UserMenu, UserSettingsModal } from "../account";
import {
  findMenuKeysByPath,
  getDefaultOpenKeys,
  getRouteFromKey,
  type MenuItemConfig,
  menuConfig,
} from "./constants";
import type { DashboardLayoutProps } from "./types";

export interface DashboardLayoutBaseProps extends DashboardLayoutProps {
  /** Base path for navigation, e.g. "/dashboard" or "/dashboard/my-team" */
  basePath: string;
  /** Content rendered at the top of the sidebar (WorkspaceSwitcher or brand) */
  sidebarHeader: ReactNode;
  /** Content rendered at the top of the mobile drawer (WorkspaceSwitcher or brand) */
  mobileDrawerHeader: ReactNode;
  /** Additional modals (e.g. CreateWorkspaceModal) */
  extraModals?: ReactNode;
  /** Fallback UI when workspace is not found (only used in Multi mode) */
  notFoundFallback?: ReactNode | null;
  /** Whether workspace data is still loading */
  isWorkspaceLoading?: boolean;
}

export default function DashboardLayoutBase({
  user,
  lang: _lang,
  langMode,
  theme,
  themeMode,
  onUpdateUser,
  onLogout,
  onChangeLangMode,
  onChangeThemeMode,
  basePath,
  sidebarHeader,
  mobileDrawerHeader,
  extraModals,
  notFoundFallback,
  isWorkspaceLoading,
}: DashboardLayoutBaseProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemSettingsOpen, setSystemSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const updateProfileMutation = trpc.user.updateProfile.useMutation();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // 处理主题切换，同时保存到后端
  const handleThemeModeChange = (mode: ThemeMode) => {
    onChangeThemeMode(mode);
    if (user) {
      updateProfileMutation.mutate(
        { settings: { themeMode: mode } },
        { onSuccess: (updatedUser: User) => onUpdateUser(updatedUser) },
      );
    }
  };

  // 处理语言切换，同时保存到后端
  const handleLangModeChange = (mode: LangMode) => {
    onChangeLangMode(mode);
    if (user) {
      updateProfileMutation.mutate(
        { settings: { langMode: mode } },
        { onSuccess: (updatedUser: User) => onUpdateUser(updatedUser) },
      );
    }
  };

  // 语言下拉菜单选项
  const langItems = Object.entries(LANG_NAMES).map(([key, label]) => ({
    key,
    label,
  }));
  langItems.unshift({ key: "auto", label: t("common.auto") });

  // 主题下拉菜单选项
  const themeItems = [
    { key: "auto", label: t("common.auto") },
    { key: "light", label: t("common.theme.light") },
    { key: "dark", label: t("common.theme.dark") },
  ];

  // 将 menuConfig 转换为 Ant Design Menu 的 items 格式
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

      const label = getLabel(item.labelKey);

      if (item.children && item.children.length > 0) {
        return {
          key: item.key,
          label,
          children: buildMenuItems(item.children),
        };
      }

      return {
        key: item.key,
        label,
      };
    });
  };

  const menuItemConfigs = buildMenuItems(menuConfig);

  // 根据当前路径计算激活的菜单 keys
  const selectedKeys = useMemo(
    () => findMenuKeysByPath(location.pathname, basePath),
    [location.pathname, basePath],
  );
  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    getDefaultOpenKeys(selectedKeys),
  );

  // 当选中项变化时，自动展开父级菜单
  useEffect(() => {
    const defaultOpenKeys = getDefaultOpenKeys(selectedKeys);
    setOpenKeys((prev) => {
      const newKeys = new Set([...prev, ...defaultOpenKeys]);
      return Array.from(newKeys);
    });
  }, [selectedKeys]);

  const handleMenuClick = (key: string) => {
    const routeSuffix = getRouteFromKey(key);
    if (routeSuffix !== null) {
      navigate(`${basePath}${routeSuffix}`);
      setMobileMenuOpen(false);
    }
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // 未登录回退
  if (!user) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex h-full items-center justify-center">
          <div className="card max-w-md">
            <h2 className="text-2xl font-semibold">
              {t("dashboard.promptTitle")}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-300">
              {t("dashboard.promptBody")}
            </p>
            <Link className="btn mt-4 inline-flex" to="/login">
              {t("dashboard.toLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 加载中骨架屏
  if (isWorkspaceLoading) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <WorkspaceRedirectSkeleton />
      </div>
    );
  }

  // 工作空间不存在回退（仅 Multi 模式使用）
  if (notFoundFallback) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {notFoundFallback}
      </div>
    );
  }

  const sidebarMenu = (
    <Menu
      mode="inline"
      items={menuItemConfigs}
      selectedKeys={selectedKeys}
      openKeys={openKeys}
      onOpenChange={handleOpenChange}
      onClick={({ key }) => handleMenuClick(key)}
      className="border-none bg-transparent"
      theme={theme === "dark" ? "dark" : "light"}
      style={{ borderInlineEnd: "none" }}
    />
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-full w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
          {sidebarHeader}
          <nav className="flex-1 space-y-1 overflow-y-auto pt-2 text-sm">
            {sidebarMenu}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 lg:justify-end lg:px-6 lg:py-4 dark:border-slate-800 dark:bg-slate-900">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className="lg:!hidden"
            />
            <div className="flex items-center gap-3 text-sm">
              <Dropdown
                trigger={["hover"]}
                menu={{
                  items: langItems,
                  onClick: ({ key }) => handleLangModeChange(key as LangMode),
                }}
              >
                <Button
                  size="middle"
                  shape="circle"
                  type="text"
                  icon={<GlobalOutlined />}
                />
              </Dropdown>
              <Dropdown
                trigger={["hover"]}
                menu={{
                  items: themeItems,
                  onClick: ({ key }) => handleThemeModeChange(key as ThemeMode),
                }}
              >
                <Button
                  size="middle"
                  shape="circle"
                  type="text"
                  icon={<BulbOutlined />}
                />
              </Dropdown>
              <UserMenu
                user={user}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenSystemSettings={() => setSystemSettingsOpen(true)}
                onLogout={onLogout}
              />
              <UserSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                user={user}
                langMode={langMode}
                themeMode={themeMode}
                onUpdateUser={onUpdateUser}
                onChangeLangMode={onChangeLangMode}
                onChangeThemeMode={onChangeThemeMode}
              />
              <SystemSettingsModal
                open={systemSettingsOpen}
                onClose={() => setSystemSettingsOpen(false)}
                user={user}
              />
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Extra Modals (e.g. CreateWorkspaceModal) */}
      {extraModals}

      {/* Mobile Drawer Menu */}
      <Drawer
        title={null}
        placement="left"
        closable={false}
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className="lg:hidden"
        styles={{ body: { padding: 0 }, wrapper: { width: 280 } }}
      >
        <div className="flex h-full flex-col bg-white dark:bg-slate-900">
          <div className="flex justify-end p-2">
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>

          {mobileDrawerHeader}

          <nav className="flex-1 overflow-y-auto pt-2 text-sm">
            {sidebarMenu}
          </nav>
        </div>
      </Drawer>
    </div>
  );
}
