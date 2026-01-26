import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, Button, Dropdown, Menu, Drawer } from "antd";
import { GlobalOutlined, BulbOutlined, PlusOutlined, SwapOutlined, MenuOutlined, CloseOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { User } from "@acme/types";
import type { Theme, Lang, LangMode, ThemeMode } from "../../lib/types";
import { WorkspaceNotFoundPage } from "../../pages";
import { WorkspaceRedirectSkeleton } from "../../components/skeleton";
import { trpc } from "../../lib/trpc";
import { UserMenu, UserSettingsModal, SystemSettingsModal } from "../account";
import { getAvatarColor, getAvatarInitial } from "../../lib/avatar";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

type DashboardLayoutProps = {
  user: User | null;
  lang: Lang;
  langMode: LangMode;
  theme: Theme;
  themeMode: ThemeMode;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onChangeLangMode: (mode: LangMode) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId?: string | null;
  createdAt?: string;
};

// Workspace Switcher Component
function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  lang,
  onSwitch,
  onOpenCreate,
}: {
  workspaces: Workspace[];
  currentWorkspace?: string;
  lang: Lang;
  onSwitch: (slug: string) => void;
  onOpenCreate: () => void;
}) {
  const current = workspaces.find((ws) => ws.slug === currentWorkspace);
  const initial = current?.name?.charAt(0).toUpperCase() ?? "W";
  const avatarColor = getAvatarColor(current?.name ?? "Workspace");

  const workspaceMenuItems: MenuProps["items"] = [
    {
      key: "header",
      type: "group",
      label: (
        <div className="px-1 py-2">
          <div className="flex items-center gap-3">
            <Avatar
              size={48}
              style={{ backgroundColor: avatarColor, fontSize: 20, fontWeight: 600 }}
            >
              {initial}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {current?.name ?? "未选择空间站"}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-xs font-medium text-white">
                  FREE
                </span>
                <span className="text-xs text-slate-400">/{current?.slug}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "switch-title",
      type: "group",
      label: lang === "zh" ? "切换空间站" : "Switch Workspace",
      children: workspaces.map((ws) => ({
        key: ws.slug,
        label: (
          <div className="flex items-center gap-2">
            <Avatar
              size={24}
              style={{ backgroundColor: getAvatarColor(ws.name), fontSize: 12 }}
            >
              {ws.name.charAt(0).toUpperCase()}
            </Avatar>
            <span className={ws.slug === currentWorkspace ? "font-medium" : ""}>
              {ws.name}
            </span>
            {ws.slug === currentWorkspace && (
              <svg className="ml-auto h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ),
      })),
    },
    { type: "divider" },
    {
      key: "create",
      icon: <PlusOutlined />,
      label: lang === "zh" ? "新建空间站" : "Create Workspace",
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "create") {
      onOpenCreate();
      return;
    }
    if (workspaces.some((ws) => ws.slug === key)) {
      onSwitch(key);
    }
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <Dropdown
        menu={{ items: workspaceMenuItems, onClick: handleMenuClick }}
        trigger={["hover"]}
        placement="bottomRight"
        classNames={{ root: "workspace-switcher-dropdown" }}
      >
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
              {current?.name ?? "未选择空间站"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                FREE
              </span>
            </div>
          </div>
          <SwapOutlined className="text-slate-400" />
        </button>
      </Dropdown>
    </div>
  );
}

// 菜单路由后缀（相对于 /dashboard/:workspace）
const menuRouteSuffixes = [
  "", // 工作台
  "/test-requirements", // 测试需求（改名自需求中心）
  "/test-plan",
  "/test-design",
  "/execution",
  "/defects",
  "/reports",
  "/automation",
  "/settings",
  "/todulist", // 新增 TodoList 页面
  "/clash", // Clash 订阅管理
];

export default function DashboardLayout({
  user,
  lang,
  langMode,
  theme,
  themeMode,
  onUpdateUser,
  onLogout,
  onChangeLangMode,
  onChangeThemeMode,
}: DashboardLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemSettingsOpen, setSystemSettingsOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  // 处理主题切换，同时保存到后端
  const handleThemeModeChange = (mode: ThemeMode) => {
    onChangeThemeMode(mode);
    // 如果用户已登录，同步到后端
    if (user) {
      updateProfileMutation.mutate(
        { settings: { themeMode: mode } },
        {
          onSuccess: (updatedUser) => {
            onUpdateUser(updatedUser);
          }
        }
      );
    }
  };

  // 处理语言切换，同时保存到后端
  const handleLangModeChange = (mode: LangMode) => {
    onChangeLangMode(mode);
    // 如果用户已登录，同步到后端
    if (user) {
      updateProfileMutation.mutate(
        { settings: { langMode: mode } },
        {
          onSuccess: (updatedUser) => {
            onUpdateUser(updatedUser);
          }
        }
      );
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const langLabel =
      langMode === "auto" ? (lang === "zh" ? "自动" : "Auto") : lang === "zh" ? "中文" : "English";
    const themeLabel =
      themeMode === "auto" ? (lang === "zh" ? "自动" : "Auto") : theme === "dark" ? "暗黑" : "亮色";

    const langItems = [
      { key: "auto", label: lang === "zh" ? "自动" : "Auto" },
      { key: "zh", label: "中文" },
      { key: "en", label: "English" }
    ];

    const themeItems = [
      { key: "auto", label: lang === "zh" ? "自动" : "Auto" },
      { key: "light", label: lang === "zh" ? "亮色" : "Light" },
      { key: "dark", label: lang === "zh" ? "暗黑" : "Dark" }
    ];
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspace } = useParams<{ workspace: string }>();
  const prevWorkspaceRef = useRef(workspace);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 获取工作空间列表
  const workspacesQuery = trpc.workspace.list.useQuery();
  const workspaces = workspacesQuery.data ?? [];
  const workspaceExists = workspaces.some((ws) => ws.slug === workspace);
  const utils = trpc.useUtils();

  // 检测 workspace 参数变化，设置过渡状态
  useEffect(() => {
    if (prevWorkspaceRef.current !== workspace && prevWorkspaceRef.current !== undefined) {
      setIsTransitioning(true);

      // 给缓存更新一个时间窗口，等待列表查询完成
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // 增加到 500ms 确保缓存更新完成

      return () => clearTimeout(timer);
    }
    prevWorkspaceRef.current = workspace;
  }, [workspace]);

  const menuItems = [
    ...(t("dashboard.menu", { returnObjects: true }) as string[]),
    lang === "zh" ? "📋 待办清单" : "📋 Todo List",
    lang === "zh" ? "🔰 Clash 订阅" : "🔰 Clash Subscribe",
  ];

  const menuItemConfigs = menuItems.map((label, index) => ({
    key: String(index),
    label
  }));

  // 根据当前路径计算激活的菜单索引
  const getActiveIndex = () => {
    const path = location.pathname;
    const basePath = `/dashboard/${workspace}`;

    for (let i = menuRouteSuffixes.length - 1; i >= 0; i--) {
      const suffix = menuRouteSuffixes[i];
      if (suffix && path === `${basePath}${suffix}`) {
        return i;
      }
    }
    // 默认工作台
    if (path === basePath || path === `${basePath}/`) {
      return 0;
    }
    return 0;
  };

  const activeIndex = getActiveIndex();

  const handleWorkspaceChange = async (newWorkspace: string) => {
    // 跳转到新空间站的首页（工作台）
    navigate(`/dashboard/${newWorkspace}`);

    // 刷新所有相关数据
    await Promise.all([
      utils.workspace.list.invalidate(),
      utils.workspace.getBySlug.invalidate({ slug: newWorkspace }),
      // 如果有其他需要刷新的查询，在这里添加
    ]);
  };

  const handleMenuClick = (index: number) => {
    const suffix = menuRouteSuffixes[index];
    navigate(`/dashboard/${workspace}${suffix}`);
    setMobileMenuOpen(false);
  };

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

  if (workspacesQuery.isLoading) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <WorkspaceRedirectSkeleton />
      </div>
    );
  }

  // 在过渡期间，跳过 workspace 存在性检查，直接渲染内容
  // 这样可以避免闪烁，让页面内容平滑过渡
  if (workspacesQuery.isFetched && !workspaceExists && !isTransitioning) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <WorkspaceNotFoundPage workspace={workspace} fallbackWorkspace={workspaces[0]?.slug} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-full w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
          {/* Workspace Switcher at Top */}
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspace={workspace}
            lang={lang}
            onSwitch={handleWorkspaceChange}
            onOpenCreate={() => setCreateWorkspaceOpen(true)}
          />

          <nav className="flex-1 space-y-1 overflow-y-auto pt-2 text-sm">
            <Menu
              mode="inline"
              items={menuItemConfigs}
              selectedKeys={[String(activeIndex)]}
              onClick={({ key }) => handleMenuClick(Number(key))}
              className="border-none bg-transparent"
              theme={theme === "dark" ? "dark" : "light"}
              style={{ borderInlineEnd: 'none' }}
            />
          </nav>

        </aside>

        {/* Main Content */}
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 lg:justify-end lg:px-6 lg:py-4 dark:border-slate-800 dark:bg-slate-900">
            {/* Mobile menu button */}
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
                  onClick: ({ key }) => handleLangModeChange(key as LangMode)
                }}
              >
                <Button size="middle" shape="circle" type="text" icon={<GlobalOutlined />} />
              </Dropdown>
              <Dropdown
                trigger={["hover"]}
                menu={{
                  items: themeItems,
                  onClick: ({ key }) => handleThemeModeChange(key as ThemeMode)
                }}
              >
                <Button size="middle" shape="circle" type="text" icon={<BulbOutlined />} />
              </Dropdown>
              <UserMenu
                user={user}
                lang={lang}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenSystemSettings={() => setSystemSettingsOpen(true)}
                onLogout={onLogout}
              />
              <UserSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                user={user}
                lang={lang}
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
                lang={lang}
              />
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        open={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        lang={lang}
        onSuccess={(newWorkspace) => {
          // Navigate to the newly created workspace
          navigate(`/dashboard/${newWorkspace.slug}`);
          setMobileMenuOpen(false);
        }}
      />

      {/* Mobile Drawer Menu */}
      <Drawer
        title={null}
        placement="left"
        closable={false}
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        className="lg:hidden"
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex h-full flex-col bg-white dark:bg-slate-900">
          {/* Close button */}
          <div className="flex justify-end p-2">
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>

          {/* Workspace Switcher */}
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspace={workspace}
            lang={lang}
            onSwitch={(slug) => {
              handleWorkspaceChange(slug);
              setMobileMenuOpen(false);
            }}
            onOpenCreate={() => {
              setCreateWorkspaceOpen(true);
              setMobileMenuOpen(false);
            }}
          />

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto pt-2 text-sm">
            <Menu
              mode="inline"
              items={menuItemConfigs}
              selectedKeys={[String(activeIndex)]}
              onClick={({ key }) => handleMenuClick(Number(key))}
              className="border-none bg-transparent"
              theme={theme === "dark" ? "dark" : "light"}
              style={{ borderInlineEnd: 'none' }}
            />
          </nav>
        </div>
      </Drawer>
    </div>
  );
}
