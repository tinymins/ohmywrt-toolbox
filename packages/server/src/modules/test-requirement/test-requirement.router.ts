import {
  CreateTestRequirementInputSchema,
  DeleteTestRequirementInputSchema,
  TestRequirementListQuerySchema,
  TestRequirementSchema,
  UpdateTestRequirementInputSchema,
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
import { requireWorkspace } from "../../trpc/middlewares";
import { testRequirementService } from "./test-requirement.service";

export const listOutputSchema = z.object({
  items: z.array(TestRequirementSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

@Router({ alias: "testRequirement" })
export class TestRequirementRouter {
  private readonly logger = new Logger(TestRequirementRouter.name);

  constructor() {
    this.logger.log("TestRequirementRouter registered");
  }

  @UseMiddlewares(requireWorkspace)
  @Query({
    input: TestRequirementListQuerySchema.optional(),
    output: listOutputSchema,
  })
  async list(
    input: z.infer<typeof TestRequirementListQuerySchema> | undefined,
    @Ctx() ctx: Context,
  ) {
    const query = input ?? { page: 1, pageSize: 20 };
    return testRequirementService.list(ctx.workspace!.id, query);
  }

  @UseMiddlewares(requireWorkspace)
  @Query({
    input: z.object({ id: z.string() }),
    output: TestRequirementSchema.nullable(),
  })
  async getById(input: { id: string }, @Ctx() ctx: Context) {
    return testRequirementService.getById(input.id, ctx.workspace!.id);
  }

  @UseMiddlewares(requireWorkspace)
  @Query({
    input: z.object({ parentId: z.string() }),
    output: listOutputSchema,
  })
  async getChildren(input: { parentId: string }, @Ctx() ctx: Context) {
    return testRequirementService.getChildren(
      input.parentId,
      ctx.workspace!.id,
    );
  }

  @UseMiddlewares(requireWorkspace)
  @Mutation({
    input: CreateTestRequirementInputSchema,
    output: TestRequirementSchema,
  })
  async create(
    input: z.infer<typeof CreateTestRequirementInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return testRequirementService.create(
      input,
      ctx.workspace!.id,
      ctx.userId,
      ctx.language,
    );
  }

  @UseMiddlewares(requireWorkspace)
  @Mutation({
    input: UpdateTestRequirementInputSchema,
    output: TestRequirementSchema,
  })
  async update(
    input: z.infer<typeof UpdateTestRequirementInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return testRequirementService.update(
      input.id,
      ctx.workspace!.id,
      input,
      ctx.language,
    );
  }

  @UseMiddlewares(requireWorkspace)
  @Mutation({
    input: DeleteTestRequirementInputSchema,
    output: z.object({ id: z.string() }),
  })
  async delete(
    input: z.infer<typeof DeleteTestRequirementInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return testRequirementService.delete(
      input.id,
      ctx.workspace!.id,
      ctx.language,
    );
  }
}
