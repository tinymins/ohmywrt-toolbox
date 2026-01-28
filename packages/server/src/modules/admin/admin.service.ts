import { sql } from "drizzle-orm";
import { db } from "../../db/client";

export class AdminService {
	async getStats() {
		const result = await db.execute(sql`select count(*)::int as count from users`);
		const count = Number(result.rows?.[0]?.count ?? 0);
		return { userCount: count };
	}
}

export const adminService = new AdminService();
