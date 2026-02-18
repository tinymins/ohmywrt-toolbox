import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { todos } from "../../db/schema";
import { getMessage, type Language } from "../../i18n";

export class TodoService {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(todos)
      .where(eq(todos.workspaceId, workspaceId))
      .orderBy(desc(todos.createdAt));
  }

  async getById(id: string, workspaceId: string) {
    const [todo] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.workspaceId, workspaceId)))
      .limit(1);

    return todo ?? null;
  }

  async create(
    input: { title: string; category?: string },
    workspaceId: string,
    createdBy?: string,
    language?: Language,
  ) {
    const [created] = await db
      .insert(todos)
      .values({
        workspaceId,
        title: input.title,
        category:
          input.category ??
          getMessage(language ?? "zh-CN", "dashboard.todoList.defaultCategory"),
        createdBy,
      })
      .returning();

    return created;
  }

  async update(
    id: string,
    workspaceId: string,
    input: { title?: string; category?: string; completed?: boolean },
    language: Language,
  ) {
    const existing = await this.getById(id, workspaceId);

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.todo.notFound"),
      });
    }

    const [updated] = await db
      .update(todos)
      .set({
        title: input.title ?? existing.title,
        category: input.category ?? existing.category,
        completed: input.completed ?? existing.completed,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, id))
      .returning();

    return updated;
  }

  async delete(id: string, workspaceId: string, language: Language) {
    const existing = await this.getById(id, workspaceId);

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.todo.notFound"),
      });
    }

    await db.delete(todos).where(eq(todos.id, id));

    return { id };
  }
}

export const todoService = new TodoService();
