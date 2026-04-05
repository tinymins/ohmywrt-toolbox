import { createQuery, createMutation } from "@/lib/rust-api-runtime";

// ─── Types ───

export interface TodoOutput {
  id: string;
  workspaceId: string;
  title: string;
  category: string;
  completed: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  category?: string;
}

export interface UpdateTodoInput {
  title?: string;
  category?: string;
  completed?: boolean;
}

// ─── API ───

export const todoApi = {
  list: createQuery<{ workspaceId: string }, TodoOutput[]>({
    path: "/api/workspaces",
    pathFn: (input) =>
      `/api/workspaces/${encodeURIComponent(input.workspaceId)}/todos`,
  }),
  create: createMutation<
    CreateTodoInput & { workspaceId: string },
    TodoOutput
  >({
    path: "/api/workspaces",
    pathFn: (input) =>
      `/api/workspaces/${encodeURIComponent(input.workspaceId)}/todos`,
    bodyFn: (input) => {
      const { workspaceId: _, ...body } = input;
      return body;
    },
  }),
  update: createMutation<UpdateTodoInput & { id: string }, TodoOutput>({
    method: "PATCH",
    path: "/api/todos",
    pathFn: (input) => `/api/todos/${encodeURIComponent(input.id)}`,
    bodyFn: (input) => {
      const { id: _, ...body } = input;
      return body;
    },
  }),
  delete: createMutation<{ id: string }, { id: string }>({
    method: "DELETE",
    path: "/api/todos",
    pathFn: (input) => `/api/todos/${encodeURIComponent(input.id)}`,
  }),
};
