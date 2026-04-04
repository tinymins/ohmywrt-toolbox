import type { DropdownMenuConfig } from "@acme/components";
import {
  Avatar,
  Button,
  CloseOutlined,
  Drawer,
  Dropdown,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@acme/components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate, useParams } from "react-router";
import ProfileSettingsModal from "@/components/account/ProfileSettingsModal";
import { WorkspaceRedirectSkeleton } from "@/components/skeleton";
import {
  useAuth,
  useSystemSettings,
  useWorkspaceList,
  WorkspaceContext,
} from "@/hooks";
import { resolveAvatarUrl } from "@/lib/avatar";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import SidebarNav from "./SidebarNav";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

function WorkspaceNotFound({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="glass glass-accent p-8 text-center space-y-3 max-w-md w-full">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t("errors.workspace.notFound")}
        </h2>
        <p className="text-[var(--text-secondary)]">
          <code className="text-[var(--accent-text)]">/{slug}</code>{" "}
          {t("errors.workspace.notFoundDesc")}
        </p>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, updateUser, logout } = useAuth();
  const { workspace: currentSlug } = useParams<{ workspace: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { workspaces, isLoading } = useWorkspaceList();
  const { singleWorkspaceMode } = useSystemSettings();

  if (isLoading) {
    return <WorkspaceRedirectSkeleton />;
  }

  const currentWorkspace = currentSlug
    ? (workspaces.find((ws) => ws.slug === currentSlug) ?? null)
    : null;

  const workspaceNotFound = currentSlug && currentWorkspace === null;

  const displayName = user ? user.name || user.email : "";
  const avatarInitial = user
    ? (user.name || user.email || "?").charAt(0).toUpperCase()
    : "";
  const avatarSrc = resolveAvatarUrl(user?.settings?.avatarKey) ?? undefined;

  const sidebarUserMenuItems: DropdownMenuConfig["items"] = [
    {
      key: "header",
      disabled: true,
      label: (
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar size={40} src={avatarSrc}>
            {avatarInitial}
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {displayName}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {user?.email}
            </span>
          </div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "settings",
      icon: <UserOutlined style={{ color: "#1677ff" }} />,
      label: t("userMenu.profileSettings"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ff4d4f" }} />,
      label: t("userMenu.signOut"),
    },
  ];

  const handleSidebarUserMenuClick: DropdownMenuConfig["onClick"] = ({
    key,
  }) => {
    if (key === "settings") setSettingsOpen(true);
    if (key === "logout") logout();
  };

  const sidebarHeader = singleWorkspaceMode ? (
    <div className="flex h-16 items-center border-b border-[var(--border-base)] px-4">
      <div className="text-lg font-bold bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary,#38bdf8)] bg-clip-text text-transparent">
        {t("brand")}
      </div>
    </div>
  ) : (
    <div className="border-b border-[var(--border-base)] p-2">
      <WorkspaceSwitcher
        workspaces={workspaces}
        currentSlug={currentSlug}
        onCreateNew={() => setCreateOpen(true)}
      />
    </div>
  );

  const userSection = user && (
    <div className="border-t border-[var(--border-base)] p-2">
      <Dropdown
        trigger={["hover"]}
        placement="topLeft"
        menu={{
          items: sidebarUserMenuItems,
          onClick: handleSidebarUserMenuClick,
        }}
      >
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-hover)]"
        >
          <Avatar size={32} src={avatarSrc} style={{ flexShrink: 0 }}>
            {avatarInitial}
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div
              className="truncate text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {user?.email}
            </div>
          </div>
        </button>
      </Dropdown>
    </div>
  );

  const sidebarMenu = (
    <nav className="flex-1 space-y-1 overflow-y-auto pt-2 text-sm">
      <SidebarNav />
    </nav>
  );

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="aurora-bg" />
      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="glass-sidebar hidden h-full w-64 flex-shrink-0 flex-col lg:flex">
          {sidebarHeader}
          {sidebarMenu}
          {userSection}
        </aside>

        {/* Main Content */}
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="glass-header flex h-16 items-center justify-between gap-4 px-4 lg:hidden">
            <Button
              variant="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 lg:px-6 lg:py-6">
            {workspaceNotFound ? (
              <WorkspaceNotFound slug={currentSlug} />
            ) : (
              <WorkspaceContext.Provider value={currentWorkspace}>
                <Outlet />
              </WorkspaceContext.Provider>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title={null}
        placement="left"
        closable={false}
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className="lg:hidden"
        styles={{ body: { padding: 0 }, wrapper: { width: 280 } }}
      >
        <div className="flex h-full flex-col bg-transparent">
          <div className="flex h-16 items-center justify-between border-b border-[var(--border-base)] px-4">
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary,#38bdf8)] bg-clip-text text-transparent">
                {t("brand")}
              </div>
            </div>
            <Button
              variant="text"
              icon={<CloseOutlined />}
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
          {sidebarMenu}
          {userSection}
        </div>
      </Drawer>

      {/* Modals */}
      {user && (
        <ProfileSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          onUpdateUser={updateUser}
        />
      )}
      {!singleWorkspaceMode && (
        <CreateWorkspaceModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={(ws) => {
            setCreateOpen(false);
            navigate(`/dashboard/${ws.slug}`);
          }}
        />
      )}
    </div>
  );
}
