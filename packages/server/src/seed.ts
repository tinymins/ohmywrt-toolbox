import "dotenv/config";

import { eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { users, workspaceMembers, workspaces } from "./db/schema";
import { getMessage } from "./i18n";

const seedUsers = [
  {
    name: "Admin",
    email: "admin@example.com",
    passwordHash: "password",
    role: "superadmin",
  },
  {
    name: "User",
    email: "user@example.com",
    passwordHash: "password",
    role: "user",
  },
];

async function seed() {
  await db.execute(sql`create extension if not exists "pgcrypto";`);

  await db.execute(sql`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null default 'user',
      created_at timestamptz default now()
    )
  `);

  await db.execute(sql`
    alter table users add column if not exists name text;
  `);

  await db.execute(sql`
    create table if not exists workspaces (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique,
      name text not null,
      description text,
      owner_id uuid references users(id),
      created_at timestamptz default now()
    )
  `);

  await db.execute(sql`
    create table if not exists workspace_members (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id),
      user_id uuid not null references users(id),
      role text not null default 'member',
      created_at timestamptz default now()
    )
  `);

  await db.execute(sql`
    create table if not exists todos (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id),
      title text not null,
      category text not null default '默认',
      completed boolean not null default false,
      created_by uuid references users(id),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);

  for (const seedUser of seedUsers) {
    // 检查用户是否存在
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, seedUser.email));

    if (!user) {
      // 创建用户
      [user] = await db.insert(users).values(seedUser).returning();
      console.log(`Created user: ${user.email}`);
    } else if (!user.name) {
      await db
        .update(users)
        .set({ name: seedUser.name })
        .where(eq(users.id, user.id));
    }

    // 检查用户是否有工作空间
    const [existingMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);

    if (!existingMembership) {
      // 为用户创建默认工作空间
      const workspaceName = `${seedUser.name}${getMessage("zh-CN", "errors.admin.workspaceSuffix")}`;
      const workspaceSlug = seedUser.name.toLowerCase();

      const [workspace] = await db
        .insert(workspaces)
        .values({
          slug: workspaceSlug,
          name: workspaceName,
          description: getMessage("zh-CN", "errors.admin.defaultWorkspaceDesc"),
          ownerId: user.id,
        })
        .returning();

      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      });

      console.log(
        `Created workspace "${workspaceName}" for user: ${user.email}`,
      );
    }
  }

  console.log("Seed completed");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
