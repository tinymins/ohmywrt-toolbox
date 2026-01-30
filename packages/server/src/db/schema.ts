import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  settings: jsonb("settings"),
  role: text("role").notNull().default("user"), // superadmin, admin, user
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
});

// 系统设置表（单行配置）
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("默认"),
  completed: boolean("completed").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 邀请码表
export const invitationCodes = pgTable("invitation_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // 邀请码
  createdBy: uuid("created_by").references(() => users.id).notNull(), // 创建者（超管）
  usedBy: uuid("used_by").references(() => users.id), // 使用者
  usedAt: timestamp("used_at", { withTimezone: true }), // 使用时间
  expiresAt: timestamp("expires_at", { withTimezone: true }), // 过期时间（可选）
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 测试需求表
export const testRequirements = pgTable("test_requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  code: text("code").notNull(), // 需求编号，如 TR-0001
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // Markdown 内容
  type: text("type").notNull().default("functional"), // 需求类型
  status: text("status").notNull().default("draft"), // 状态
  priority: text("priority").notNull().default("medium"), // 优先级
  parentId: uuid("parent_id").references((): any => testRequirements.id), // 父需求
  tags: jsonb("tags").$type<string[]>(), // 标签数组
  assigneeId: uuid("assignee_id").references(() => users.id), // 负责人
  createdBy: uuid("created_by").references(() => users.id), // 创建者
  dueDate: timestamp("due_date", { withTimezone: true }), // 截止日期
  estimatedHours: text("estimated_hours"), // 预估工时（存为文本以支持小数）
  actualHours: text("actual_hours"), // 实际工时
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
