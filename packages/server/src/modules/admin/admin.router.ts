import { Logger } from "@nestjs/common";
import { z } from "zod";
import { Query, Router } from "../../trpc/decorators";
import { adminService } from "./admin.service";

export const statsOutput = z.tuple([z.number(), z.number(), z.string()]);

@Router({ alias: "admin" })
export class AdminRouter {
	private readonly logger = new Logger(AdminRouter.name);

	constructor() {
		this.logger.log("AdminRouter registered");
	}
	@Query({ output: statsOutput })
	async stats() {
		const stats = await adminService.getStats();
		return [stats.userCount, 42, "OK"] as const;
	}

	@Query({ output: z.string() })
	async health() {
		return "healthy";
	}
}
