import type { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { sessions, users, workspaceMembers, workspaces } from "../../db/schema";
import type { UserSettings } from "@acme/types";

const SESSION_COOKIE_NAME = "SESSION_ID";
const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

export const toUserOutput = (user: typeof users.$inferSelect) => ({
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role as "admin" | "user",
	settings: (user.settings as UserSettings | null) ?? null
});

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");

export class AuthService {
	async getUserByEmail(email: string) {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email));
		return user ?? null;
	}

	async getDefaultWorkspaceSlug(userId: string) {
		const [workspace] = await db
			.select({ slug: workspaces.slug })
			.from(workspaceMembers)
			.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
			.where(eq(workspaceMembers.userId, userId))
			.orderBy(workspaces.createdAt)
			.limit(1);
		return workspace?.slug ?? null;
	}

	async ensureUniqueWorkspaceSlug(base: string) {
		const baseSlug = slugify(base) || "workspace";
		let slug = baseSlug;
		let suffix = 1;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			const [existing] = await db
				.select({ id: workspaces.id })
				.from(workspaces)
				.where(eq(workspaces.slug, slug))
				.limit(1);
			if (!existing) return slug;
			slug = `${baseSlug}-${suffix}`;
			suffix += 1;
		}
	}

	async createSession(userId: string) {
		const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE);
		const [session] = await db
			.insert(sessions)
			.values({ userId, expiresAt })
			.returning({ id: sessions.id });
		return session.id;
	}

	async deleteSession(sessionId: string) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
	}

	async registerUser(input: { name: string; email: string; password: string }) {
		const workspaceName = `${input.name}的空间站`;
		const workspaceSlug = await this.ensureUniqueWorkspaceSlug(workspaceName);

		const result = await db.transaction(async (tx) => {
			const [createdUser] = await tx
				.insert(users)
				.values({
					name: input.name,
					email: input.email,
					passwordHash: input.password,
					role: "user"
				})
				.returning();

			const [createdWorkspace] = await tx
				.insert(workspaces)
				.values({
					slug: workspaceSlug,
					name: workspaceName,
					description: "默认工作空间",
					ownerId: createdUser.id
				})
				.returning();

			await tx.insert(workspaceMembers).values({
				workspaceId: createdWorkspace.id,
				userId: createdUser.id,
				role: "owner"
			});

			return { user: createdUser, workspace: createdWorkspace };
		});

		return result;
	}

	setSessionCookie(res: Response, sessionId: string) {
		res.cookie(SESSION_COOKIE_NAME, sessionId, {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			maxAge: SESSION_COOKIE_MAX_AGE,
			path: "/"
		});
	}

	clearSessionCookie(res: Response) {
		res.clearCookie(SESSION_COOKIE_NAME, {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			path: "/"
		});
	}
}

export const authService = new AuthService();
