import { z } from "zod";

/**
 * 测试需求优先级
 */
export const TestRequirementPrioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);
export type TestRequirementPriority = z.infer<
  typeof TestRequirementPrioritySchema
>;

/**
 * 测试需求状态
 */
export const TestRequirementStatusSchema = z.enum([
  "draft", // 草稿
  "pending", // 待审核
  "approved", // 已批准
  "in_progress", // 进行中
  "completed", // 已完成
  "rejected", // 已拒绝
  "cancelled", // 已取消
]);
export type TestRequirementStatus = z.infer<typeof TestRequirementStatusSchema>;

/**
 * 测试需求类型
 */
export const TestRequirementTypeSchema = z.enum([
  "functional", // 功能测试
  "performance", // 性能测试
  "security", // 安全测试
  "usability", // 易用性测试
  "compatibility", // 兼容性测试
  "integration", // 集成测试
  "regression", // 回归测试
]);
export type TestRequirementType = z.infer<typeof TestRequirementTypeSchema>;

/**
 * 测试需求 Schema
 */
export const TestRequirementSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  code: z.string(), // 需求编号，如 TR-0001
  title: z.string(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(), // Markdown 内容
  type: TestRequirementTypeSchema,
  status: TestRequirementStatusSchema,
  priority: TestRequirementPrioritySchema,
  parentId: z.string().nullable().optional(), // 父需求 ID（用于子需求）
  tags: z.array(z.string()).nullable().optional(), // 标签
  assigneeId: z.string().nullable().optional(), // 负责人
  createdBy: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().nullable().optional(), // 截止日期
  estimatedHours: z.number().nullable().optional(), // 预估工时
  actualHours: z.number().nullable().optional(), // 实际工时
  // 关联信息
  childrenCount: z.number().optional(), // 子需求数量
  creatorName: z.string().nullable().optional(), // 创建者名称
  assigneeName: z.string().nullable().optional(), // 负责人名称
});
export type TestRequirement = z.infer<typeof TestRequirementSchema>;

/**
 * 创建测试需求输入
 */
export const CreateTestRequirementInputSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional(),
  content: z.string().optional(),
  type: TestRequirementTypeSchema.default("functional"),
  status: TestRequirementStatusSchema.default("draft"),
  priority: TestRequirementPrioritySchema.default("medium"),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(), // ISO 日期字符串
  estimatedHours: z.number().optional(),
});
export type CreateTestRequirementInput = z.infer<
  typeof CreateTestRequirementInputSchema
>;

/**
 * 更新测试需求输入
 */
export const UpdateTestRequirementInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  type: TestRequirementTypeSchema.optional(),
  status: TestRequirementStatusSchema.optional(),
  priority: TestRequirementPrioritySchema.optional(),
  parentId: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  actualHours: z.number().nullable().optional(),
});
export type UpdateTestRequirementInput = z.infer<
  typeof UpdateTestRequirementInputSchema
>;

/**
 * 删除测试需求输入
 */
export const DeleteTestRequirementInputSchema = z.object({
  id: z.string(),
});
export type DeleteTestRequirementInput = z.infer<
  typeof DeleteTestRequirementInputSchema
>;

/**
 * 测试需求列表查询参数
 */
export const TestRequirementListQuerySchema = z.object({
  status: TestRequirementStatusSchema.optional(),
  type: TestRequirementTypeSchema.optional(),
  priority: TestRequirementPrioritySchema.optional(),
  parentId: z.string().nullable().optional(), // null 表示查询顶级需求
  keyword: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});
export type TestRequirementListQuery = z.infer<
  typeof TestRequirementListQuerySchema
>;
