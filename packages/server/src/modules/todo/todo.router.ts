import { Logger } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "../../trpc/context";
import {
  Ctx,
  Mutation,
  Query,
  Router,
  UseMiddlewares,
} from "../../trpc/decorators";
import { requireWorkspace } from "../../trpc/middlewares";
import { todoService } from "./todo.service";

export const todoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  category: z.string(),
  completed: z.boolean(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const todoListOutput = z.array(todoSchema);

export const todoCreateInput = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
});

export const todoUpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  category: z.string().optional(),
  completed: z.boolean().optional(),
});

export const todoDeleteInput = z.object({
  id: z.string(),
});

@Router({ alias: "todo" })
export class TodoRouter {
  private readonly logger = new Logger(TodoRouter.name);

  constructor() {
    this.logger.log("TodoRouter registered");
  }
  @UseMiddlewares(requireWorkspace)
  @Query({ output: todoListOutput })
  async list(@Ctx() ctx: Context) {
    return todoService.listByWorkspace(ctx.workspace!.id);
  }

  @UseMiddlewares(requireWorkspace)
  @Mutation({ input: todoCreateInput, output: todoSchema })
  async create(input: z.infer<typeof todoCreateInput>, @Ctx() ctx: Context) {
    return todoService.create(
      input,
      ctx.workspace!.id,
      ctx.userId,
      ctx.language,
    );
  }

  @UseMiddlewares(requireWorkspace)
  @Mutation({ input: todoUpdateInput, output: todoSchema })
  async update(input: z.infer<typeof todoUpdateInput>, @Ctx() ctx: Context) {
    return todoService.update(input.id, ctx.workspace!.id, input, ctx.language);
  }

  @UseMiddlewares(requireWorkspace)
  @Mutation({ input: todoDeleteInput, output: z.object({ id: z.string() }) })
  async delete(input: z.infer<typeof todoDeleteInput>, @Ctx() ctx: Context) {
    return todoService.delete(input.id, ctx.workspace!.id, ctx.language);
  }
}
