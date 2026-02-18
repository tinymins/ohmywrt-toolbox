import type {
  CreateTestRequirementInput,
  TestRequirementListQuery,
  TestRequirementPriority,
  TestRequirementStatus,
  TestRequirementType,
  UpdateTestRequirementInput,
} from "@acme/types";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { testRequirements, users } from "../../db/schema";
import { getMessage, type Language } from "../../i18n";

// 转换数据库记录为 API 输出格式
const toOutput = (
  requirement: typeof testRequirements.$inferSelect,
  extra: {
    childrenCount: number;
    creatorName: string | null;
    assigneeName: string | null;
  },
) => ({
  id: requirement.id,
  workspaceId: requirement.workspaceId,
  code: requirement.code,
  title: requirement.title,
  description: requirement.description,
  content: requirement.content,
  type: requirement.type as TestRequirementType,
  status: requirement.status as TestRequirementStatus,
  priority: requirement.priority as TestRequirementPriority,
  parentId: requirement.parentId,
  tags: (requirement.tags as string[] | null) ?? null,
  assigneeId: requirement.assigneeId,
  createdBy: requirement.createdBy,
  createdAt: requirement.createdAt ?? undefined,
  updatedAt: requirement.updatedAt ?? undefined,
  dueDate: requirement.dueDate ?? undefined,
  estimatedHours: requirement.estimatedHours
    ? parseFloat(requirement.estimatedHours)
    : null,
  actualHours: requirement.actualHours
    ? parseFloat(requirement.actualHours)
    : null,
  childrenCount: extra.childrenCount,
  creatorName: extra.creatorName,
  assigneeName: extra.assigneeName,
});

export class TestRequirementService {
  /**
   * 生成下一个需求编号
   */
  private async generateCode(workspaceId: string): Promise<string> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(testRequirements)
      .where(eq(testRequirements.workspaceId, workspaceId));

    const nextNumber = (result?.count ?? 0) + 1;
    return `TR-${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * 获取测试需求列表
   */
  async list(workspaceId: string, query: TestRequirementListQuery) {
    const conditions = [eq(testRequirements.workspaceId, workspaceId)];

    if (query.status) {
      conditions.push(eq(testRequirements.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(testRequirements.type, query.type));
    }
    if (query.priority) {
      conditions.push(eq(testRequirements.priority, query.priority));
    }
    if (query.parentId === null) {
      conditions.push(isNull(testRequirements.parentId));
    } else if (query.parentId) {
      conditions.push(eq(testRequirements.parentId, query.parentId));
    }
    if (query.keyword) {
      conditions.push(
        or(
          like(testRequirements.title, `%${query.keyword}%`),
          like(testRequirements.code, `%${query.keyword}%`),
          like(testRequirements.description, `%${query.keyword}%`),
        )!,
      );
    }

    const offset = (query.page - 1) * query.pageSize;

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(testRequirements)
      .where(and(...conditions));

    // 获取数据
    const items = await db
      .select({
        requirement: testRequirements,
        creator: {
          id: users.id,
          name: users.name,
        },
      })
      .from(testRequirements)
      .leftJoin(users, eq(testRequirements.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(testRequirements.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    // 查询每个需求的子需求数量
    const itemsWithChildren = await Promise.all(
      items.map(async (item) => {
        const [childCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(testRequirements)
          .where(eq(testRequirements.parentId, item.requirement.id));

        // 查询负责人信息
        let assigneeName: string | null = null;
        if (item.requirement.assigneeId) {
          const [assignee] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, item.requirement.assigneeId))
            .limit(1);
          assigneeName = assignee?.name ?? null;
        }

        return toOutput(item.requirement, {
          childrenCount: Number(childCount?.count ?? 0),
          creatorName: item.creator?.name ?? null,
          assigneeName,
        });
      }),
    );

    return {
      items: itemsWithChildren,
      total: Number(countResult?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 获取单个测试需求
   */
  async getById(id: string, workspaceId: string) {
    const [result] = await db
      .select({
        requirement: testRequirements,
        creator: {
          id: users.id,
          name: users.name,
        },
      })
      .from(testRequirements)
      .leftJoin(users, eq(testRequirements.createdBy, users.id))
      .where(
        and(
          eq(testRequirements.id, id),
          eq(testRequirements.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!result) return null;

    // 查询子需求数量
    const [childCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(testRequirements)
      .where(eq(testRequirements.parentId, id));

    // 查询负责人
    let assigneeName: string | null = null;
    if (result.requirement.assigneeId) {
      const [assignee] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, result.requirement.assigneeId))
        .limit(1);
      assigneeName = assignee?.name ?? null;
    }

    return toOutput(result.requirement, {
      childrenCount: Number(childCount?.count ?? 0),
      creatorName: result.creator?.name ?? null,
      assigneeName,
    });
  }

  /**
   * 创建测试需求
   */
  async create(
    input: CreateTestRequirementInput,
    workspaceId: string,
    createdBy: string | undefined,
    language: Language,
  ) {
    const code = await this.generateCode(workspaceId);

    const [created] = await db
      .insert(testRequirements)
      .values({
        workspaceId,
        code,
        title: input.title,
        description: input.description,
        content: input.content,
        type: input.type,
        status: input.status,
        priority: input.priority,
        parentId: input.parentId,
        tags: input.tags,
        assigneeId: input.assigneeId,
        createdBy,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        estimatedHours: input.estimatedHours?.toString(),
      })
      .returning();

    const result = await this.getById(created.id, workspaceId);
    if (!result) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(
          language,
          "errors.testRequirement.createFetchFailed",
        ),
      });
    }
    return result;
  }

  /**
   * 更新测试需求
   */
  async update(
    id: string,
    workspaceId: string,
    input: UpdateTestRequirementInput,
    language: Language,
  ) {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.testRequirement.notFound"),
      });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.parentId !== undefined) updateData.parentId = input.parentId;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.assigneeId !== undefined)
      updateData.assigneeId = input.assigneeId;
    if (input.dueDate !== undefined)
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.estimatedHours !== undefined)
      updateData.estimatedHours = input.estimatedHours?.toString() ?? null;
    if (input.actualHours !== undefined)
      updateData.actualHours = input.actualHours?.toString() ?? null;

    await db
      .update(testRequirements)
      .set(updateData)
      .where(eq(testRequirements.id, id));

    const result = await this.getById(id, workspaceId);
    if (!result) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(
          language,
          "errors.testRequirement.updateFetchFailed",
        ),
      });
    }
    return result;
  }

  /**
   * 删除测试需求
   */
  async delete(id: string, workspaceId: string, language: Language) {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.testRequirement.notFound"),
      });
    }

    // 检查是否有子需求
    if (existing.childrenCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(
          language,
          "errors.testRequirement.deleteChildrenFirst",
        ),
      });
    }

    await db.delete(testRequirements).where(eq(testRequirements.id, id));

    return { id };
  }

  /**
   * 获取子需求列表
   */
  async getChildren(parentId: string, workspaceId: string) {
    return this.list(workspaceId, {
      parentId,
      page: 1,
      pageSize: 100,
    });
  }
}

export const testRequirementService = new TestRequirementService();
