import { createQuery, createMutation } from "@/lib/rust-api-runtime";

// ─── Types ───

export interface TestRequirementOutput {
  id: string;
  workspaceId: string;
  code: string;
  title: string;
  description: string | null;
  content: string | null;
  type: string;
  status: string;
  priority: string;
  parentId: string | null;
  tags: unknown | null;
  assigneeId: string | null;
  createdBy: string | null;
  dueDate: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestRequirementInput {
  title: string;
  description?: string | null;
  content?: string | null;
  type?: string;
  status?: string;
  priority?: string;
  parentId?: string | null;
  tags?: unknown | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimatedHours?: string | null;
  actualHours?: string | null;
}

export type UpdateTestRequirementInput = Partial<CreateTestRequirementInput>;

// ─── API ───

export const testRequirementApi = {
  list: createQuery<
    {
      workspaceId: string;
      type?: string;
      status?: string;
      priority?: string;
    },
    TestRequirementOutput[]
  >({
    path: "/api/workspaces",
    pathFn: (input) =>
      `/api/workspaces/${encodeURIComponent(input.workspaceId)}/test-requirements`,
    paramsFn: (input) => {
      const params: Record<string, string> = {};
      if (input.type) params.type = input.type;
      if (input.status) params.status = input.status;
      if (input.priority) params.priority = input.priority;
      return params;
    },
  }),
  getById: createQuery<{ id: string }, TestRequirementOutput>({
    path: "/api/test-requirements",
    pathFn: (input) =>
      `/api/test-requirements/${encodeURIComponent(input.id)}`,
  }),
  create: createMutation<
    CreateTestRequirementInput & { workspaceId: string },
    TestRequirementOutput
  >({
    path: "/api/workspaces",
    pathFn: (input) =>
      `/api/workspaces/${encodeURIComponent(input.workspaceId)}/test-requirements`,
    bodyFn: (input) => {
      const { workspaceId: _, ...body } = input;
      return body;
    },
  }),
  update: createMutation<
    UpdateTestRequirementInput & { id: string },
    TestRequirementOutput
  >({
    method: "PATCH",
    path: "/api/test-requirements",
    pathFn: (input) =>
      `/api/test-requirements/${encodeURIComponent(input.id)}`,
    bodyFn: (input) => {
      const { id: _, ...body } = input;
      return body;
    },
  }),
  delete: createMutation<{ id: string }, { id: string }>({
    method: "DELETE",
    path: "/api/test-requirements",
    pathFn: (input) =>
      `/api/test-requirements/${encodeURIComponent(input.id)}`,
  }),
  getChildren: createQuery<{ id: string }, TestRequirementOutput[]>({
    path: "/api/test-requirements",
    pathFn: (input) =>
      `/api/test-requirements/${encodeURIComponent(input.id)}/children`,
  }),
};
