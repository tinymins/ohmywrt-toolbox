import { createQuery, createMutation } from "@/lib/rust-api-runtime";
import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@acme/types";

export const workspaceApi = {
  list: createQuery<void, Workspace[]>({
    path: "/api/workspaces",
  }),
  getBySlug: createQuery<{ slug: string }, Workspace>({
    path: "/api/workspaces",
    pathFn: (input) => `/api/workspaces/${encodeURIComponent(input.slug)}`,
  }),
  create: createMutation<CreateWorkspaceInput, Workspace>({
    path: "/api/workspaces",
  }),
  update: createMutation<UpdateWorkspaceInput & { id: string }, Workspace>({
    method: "PATCH",
    path: "/api/workspaces",
    pathFn: (input) => `/api/workspaces/${encodeURIComponent(input.id)}`,
  }),
  delete: createMutation<{ id: string }, { id: string }>({
    method: "DELETE",
    path: "/api/workspaces",
    pathFn: (input) => `/api/workspaces/${encodeURIComponent(input.id)}`,
  }),
};
