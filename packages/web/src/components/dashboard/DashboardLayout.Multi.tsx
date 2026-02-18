import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trpc } from "../../lib/trpc";
import { WorkspaceNotFoundPage } from "../../pages";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import DashboardLayoutBase from "./DashboardLayoutBase";
import type { DashboardLayoutProps } from "./types";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

export function Multi(props: DashboardLayoutProps) {
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
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
    if (
      prevWorkspaceRef.current !== workspace &&
      prevWorkspaceRef.current !== undefined
    ) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    prevWorkspaceRef.current = workspace;
  }, [workspace]);

  const handleWorkspaceChange = async (newWorkspace: string) => {
    navigate(`/dashboard/${newWorkspace}`);
    await Promise.all([
      utils.workspace.list.invalidate(),
      utils.workspace.getBySlug.invalidate({ slug: newWorkspace }),
    ]);
  };

  // 工作空间不存在时的回退 UI
  const notFoundFallback =
    workspacesQuery.isFetched && !workspaceExists && !isTransitioning ? (
      <WorkspaceNotFoundPage
        workspace={workspace}
        fallbackWorkspace={workspaces[0]?.slug}
      />
    ) : null;

  const workspaceSwitcher = (
    <WorkspaceSwitcher
      workspaces={workspaces}
      currentWorkspace={workspace}
      onSwitch={handleWorkspaceChange}
      onOpenCreate={() => setCreateWorkspaceOpen(true)}
    />
  );

  const mobileWorkspaceSwitcher = (
    <WorkspaceSwitcher
      workspaces={workspaces}
      currentWorkspace={workspace}
      onSwitch={(slug) => handleWorkspaceChange(slug)}
      onOpenCreate={() => setCreateWorkspaceOpen(true)}
    />
  );

  return (
    <DashboardLayoutBase
      {...props}
      basePath={`/dashboard/${workspace}`}
      sidebarHeader={workspaceSwitcher}
      mobileDrawerHeader={mobileWorkspaceSwitcher}
      isWorkspaceLoading={workspacesQuery.isLoading}
      notFoundFallback={notFoundFallback}
      extraModals={
        <CreateWorkspaceModal
          open={createWorkspaceOpen}
          onClose={() => setCreateWorkspaceOpen(false)}
          onSuccess={(newWorkspace) => {
            navigate(`/dashboard/${newWorkspace.slug}`);
          }}
        />
      }
    />
  );
}
