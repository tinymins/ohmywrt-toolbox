import {
  CreateWorkspaceInputSchema,
  DeleteWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
  WorkspaceSchema,
} from "@acme/types";
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
import { requireUser } from "../../trpc/middlewares";
import { toWorkspaceOutput, workspaceService } from "./workspace.service";

@Router({ alias: "workspace" })
export class WorkspaceRouter {
  private readonly logger = new Logger(WorkspaceRouter.name);

  constructor() {
    this.logger.log("WorkspaceRouter registered");
  }
  @UseMiddlewares(requireUser)
  @Query({ output: z.array(WorkspaceSchema) })
  async list(@Ctx() ctx: Context) {
    const workspaces = await workspaceService.listByUser(ctx.userId!);
    return workspaces.map(toWorkspaceOutput);
  }

  @UseMiddlewares(requireUser)
  @Query({
    input: z.object({ slug: z.string() }),
    output: WorkspaceSchema.nullable(),
  })
  async getBySlug(input: { slug: string }, @Ctx() ctx: Context) {
    const workspace = await workspaceService.getBySlug(input.slug, ctx.userId!);
    return workspace ? toWorkspaceOutput(workspace) : null;
  }

  @UseMiddlewares(requireUser)
  @Mutation({ input: CreateWorkspaceInputSchema, output: WorkspaceSchema })
  async create(
    input: z.infer<typeof CreateWorkspaceInputSchema>,
    @Ctx() ctx: Context,
  ) {
    const workspace = await workspaceService.create(input, ctx.userId!);
    return toWorkspaceOutput(workspace);
  }

  @UseMiddlewares(requireUser)
  @Mutation({ input: UpdateWorkspaceInputSchema, output: WorkspaceSchema })
  async update(
    input: z.infer<typeof UpdateWorkspaceInputSchema>,
    @Ctx() ctx: Context,
  ) {
    const updated = await workspaceService.update(
      input.id,
      input,
      ctx.userId!,
      ctx.language,
    );
    return toWorkspaceOutput(updated);
  }

  @UseMiddlewares(requireUser)
  @Mutation({
    input: DeleteWorkspaceInputSchema,
    output: z.object({ id: z.string() }),
  })
  async delete(
    input: z.infer<typeof DeleteWorkspaceInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return workspaceService.delete(input.id, ctx.userId!, ctx.language);
  }
}
