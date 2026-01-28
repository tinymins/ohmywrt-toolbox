import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";
import { trpc } from "../../lib/trpc";

type TodoListPageProps = {
  lang: Lang;
};

export default function TodoListPage({ lang }: TodoListPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const [newTodo, setNewTodo] = useState("");
  const utils = trpc.useUtils();

  const todosQuery = trpc.todo.list.useQuery(undefined, {
    enabled: Boolean(workspace)
  });

  const createMutation = trpc.todo.create.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
      setNewTodo("");
    }
  });

  const updateMutation = trpc.todo.update.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
    }
  });

  const deleteMutation = trpc.todo.delete.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
    }
  });

  const toggleTodo = (id: string) => {
    const todo = todosQuery.data?.find((item) => item.id === id);
    if (!todo) return;
    updateMutation.mutate({ id, completed: !todo.completed });
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    createMutation.mutate({ title: newTodo.trim(), category: "自定义" });
  };

  const todos = todosQuery.data ?? [];
  const categories = useMemo(
    () => [...new Set(todos.map((todo) => todo.category))],
    [todos]
  );
  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const categoryStats = useMemo(
    () =>
      categories.map((category) => ({
        category,
        completed: todos.filter((todo) => todo.category === category && todo.completed).length,
        total: todos.filter((todo) => todo.category === category).length
      })),
    [categories, todos]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {lang === "zh" ? "📋 开发任务清单" : "📋 Development Todo List"}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-300">
              {lang === "zh" ? "工作空间切换功能开发进度" : "Workspace switching feature progress"}
            </p>
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              当前工作空间: {workspace}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {progress}%
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {completedCount} / {totalCount} {lang === "zh" ? "已完成" : "completed"}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add Todo */}
      <div className="card">
        <div className="flex gap-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder={lang === "zh" ? "添加新任务..." : "Add new task..."}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addTodo}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition-colors"
            disabled={createMutation.isPending}
          >
            {lang === "zh" ? "添加" : "Add"}
          </button>
        </div>
      </div>

      {/* Todo List by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        {categories.map((category) => {
          const categoryTodos = todos.filter(t => t.category === category);
          const categoryCompleted = categoryTodos.filter(t => t.completed).length;
          const allCompleted = categoryCompleted === categoryTodos.length;

          return (
            <div key={category} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {allCompleted ? "✅" : "📦"} {category}
                </h3>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  allCompleted
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {categoryCompleted}/{categoryTodos.length}
                </span>
              </div>
              <div className="space-y-2">
                {categoryTodos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                      todo.completed
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className={`text-lg ${todo.completed ? "text-green-500" : "text-slate-300"}`}>
                      {todo.completed ? "✓" : "○"}
                    </span>
                    <span className={todo.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}>
                      {todo.title}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteMutation.mutate({ id: todo.id });
                      }}
                      className="ml-auto text-xs text-slate-400 hover:text-rose-500"
                    >
                      {lang === "zh" ? "删除" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Card */}
      <div className="card bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
        <h3 className="text-lg font-semibold mb-3">
          {lang === "zh" ? "🎯 完成摘要" : "🎯 Completion Summary"}
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          {categoryStats.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {lang === "zh" ? "暂无待办" : "No todos yet"}
            </div>
          ) : (
            categoryStats.map((stat) => (
              <div key={stat.category} className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stat.completed}/{stat.total}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.category}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
