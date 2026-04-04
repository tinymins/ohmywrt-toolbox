import type { Workspace } from "@acme/types";
import { createContext, useContext } from "react";

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside DashboardLayout");
  }
  return ctx;
}

type WorkspaceListContextValue = {
  workspaces: Workspace[];
  isLoading: boolean;
};

export const WorkspaceListContext = createContext<WorkspaceListContextValue>({
  workspaces: [],
  isLoading: true,
});

export function useWorkspaceList(): WorkspaceListContextValue {
  return useContext(WorkspaceListContext);
}
