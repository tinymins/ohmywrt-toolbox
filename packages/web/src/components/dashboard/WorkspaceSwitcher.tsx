import { Dropdown, type DropdownMenuItem } from "@acme/components";
import type { Workspace } from "@acme/types";
import { Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import WorkspaceSettingsModal from "@/components/workspace/WorkspaceSettingsModal";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentSlug?: string;
  onCreateNew: () => void;
}

export default function WorkspaceSwitcher({
  workspaces,
  currentSlug,
  onCreateNew,
}: WorkspaceSwitcherProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const current = workspaces.find((ws) => ws.slug === currentSlug);

  const items: DropdownMenuItem[] = [
    ...(workspaces.length > 0
      ? [
          {
            key: "header",
            type: "label" as const,
            label: (
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  {t("workspace.workspaces")}
                </span>
                <button
                  type="button"
                  title={t("workspace.settings")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="cursor-pointer flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Settings size={13} />
                </button>
              </div>
            ),
          },
          ...workspaces.map((ws) => ({
            key: ws.id,
            label: (
              <span className="flex w-full items-center gap-2.5">
                <WsIcon name={ws.name} size="sm" />
                <span className="truncate">{ws.name}</span>
                {ws.slug === currentSlug && (
                  <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center text-xs text-[var(--text-muted)]">
                    ✓
                  </span>
                )}
              </span>
            ),
            onClick: () => {
              setOpen(false);
              navigate(`/dashboard/${ws.slug}`);
            },
          })),
          { type: "divider" as const },
        ]
      : []),
    {
      key: "create",
      label: (
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed border-[var(--border-base)] text-xs text-[var(--text-muted)]">
            +
          </span>
          <span>{t("workspace.new")}</span>
        </span>
      ),
      onClick: () => {
        setOpen(false);
        onCreateNew();
      },
    },
  ];

  return (
    <>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={["click"]}
        placement="bottomLeft"
        menu={{ items }}
      >
        <button
          type="button"
          className="cursor-pointer w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors"
        >
          <WsIcon name={current?.name ?? "?"} size="md" />
          <span className="flex-1 text-left truncate">
            {current ? current.name : t("workspace.select")}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
        </button>
      </Dropdown>
      <WorkspaceSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

function WsIcon({ name, size }: { name: string; size: "sm" | "md" }) {
  const letter = name.charAt(0).toUpperCase();
  const dim = size === "md" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)] text-xs font-bold uppercase text-[var(--text-muted)] border border-[var(--border-base)]`}
    >
      {letter}
    </span>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
