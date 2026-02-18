import { Module } from "@nestjs/common";
import { AdminRouter } from "./admin.router";
import { AdminService } from "./admin.service";

@Module({
  providers: [AdminService, AdminRouter],
  exports: [AdminService, AdminRouter],
})
export class AdminModule {}
