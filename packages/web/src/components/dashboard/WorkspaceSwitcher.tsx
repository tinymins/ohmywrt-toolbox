import { PlusOutlined, SwapOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown } from "antd";
import { useTranslation } from "react-i18next";
import { getAvatarColor } from "../../lib/avatar";
import type { Workspace } from "./types";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace?: string;
  onSwitch: (slug: string) => void;
  onOpenCreate: () => void;
}

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  onSwitch,
  onOpenCreate,
}: WorkspaceSwitcherProps) {
  const { t } = useTranslation();
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
              style={{
                backgroundColor: avatarColor,
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {initial}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {current?.name ?? t("dashboard.noWorkspaceSelected")}
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
      label: t("dashboard.workspaceSwitcher.switchWorkspace"),
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
              <svg
                className="ml-auto h-4 w-4 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
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
      label: t("createWorkspace.title"),
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
              {current?.name ?? t("dashboard.noWorkspaceSelected")}
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
