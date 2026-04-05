import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type TodoOutput, todoApi } from "@/generated/rust-api/todo";
import { useWorkspace } from "@/hooks";
import { message } from "@/lib/message";

export function TodoListPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const [newTodo, setNewTodo] = useState("");

  const {
    data: todos = [],
    isLoading,
    refetch,
  } = todoApi.list.useQuery({ workspaceId: workspace.id });

  const createMutation = todoApi.create.useMutation({
    onSuccess: () => {
      message.success(t("todo.createSuccess"));
      setNewTodo("");
      refetch();
    },
  });

  const updateMutation = todoApi.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = todoApi.delete.useMutation({
    onSuccess: () => {
      message.success(t("todo.deleteSuccess"));
      refetch();
    },
  });

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byCategory = todos.reduce<
      Record<string, { total: number; completed: number }>
    >((acc, todo) => {
      const cat = todo.category || t("todo.category.default");
      if (!acc[cat]) acc[cat] = { total: 0, completed: 0 };
      acc[cat].total++;
      if (todo.completed) acc[cat].completed++;
      return acc;
    }, {});

    return { total, completed, percent, byCategory };
  }, [todos, t]);

  const groupedTodos = useMemo(() => {
    const groups: Record<string, TodoOutput[]> = {};
    for (const todo of todos) {
      const cat = todo.category || t("todo.category.default");
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(todo);
    }
    return groups;
  }, [todos, t]);

  const handleAdd = () => {
    const title = newTodo.trim();
    if (!title) return;
    createMutation.mutate({ workspaceId: workspace.id, title });
  };

  const handleToggle = (todo: TodoOutput) => {
    updateMutation.mutate({ id: todo.id, completed: !todo.completed });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Progress */}
      <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {t("todo.progress")}: {stats.completed}/{stats.total}
          </span>
          <span className="font-medium text-[var(--text-primary)]">
            {stats.percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      {/* Add Todo */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={t("todo.addPlaceholder")}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTodo.trim() || createMutation.isPending}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("todo.addButton")}
        </button>
      </div>

      {/* Todo List grouped by category */}
      {Object.keys(groupedTodos).length === 0 ? (
        <div className="py-12 text-center text-[var(--text-muted)]">
          {t("todo.noTodos")}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTodos).map(([category, items]) => (
            <div
              key={category}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]"
            >
              <div className="border-b border-[var(--border)] px-4 py-2">
                <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                  {category}
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    ({items.filter((i) => i.completed).length}/{items.length})
                  </span>
                </h3>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {items.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(todo)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        todo.completed
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] hover:border-[var(--primary)]"
                      }`}
                    >
                      {todo.completed && (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        todo.completed
                          ? "text-[var(--text-muted)] line-through"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {todo.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(todo.id)}
                      className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-red-500"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {todos.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">
            {t("todo.summary.title")}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {stats.total}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {t("todo.summary.totalItems")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">
                {stats.completed}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {t("todo.summary.completedItems")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">
                {stats.total - stats.completed}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {t("todo.summary.pendingItems")}
              </div>
            </div>
          </div>
          {Object.keys(stats.byCategory).length > 1 && (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <div className="space-y-2">
                {Object.entries(stats.byCategory).map(([cat, s]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--text-secondary)]">{cat}</span>
                    <span className="text-[var(--text-muted)]">
                      {s.completed}/{s.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
