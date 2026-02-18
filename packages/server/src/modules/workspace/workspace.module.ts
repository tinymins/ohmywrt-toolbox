import { Module } from "@nestjs/common";
import { WorkspaceRouter } from "./workspace.router";
import { WorkspaceService } from "./workspace.service";

@Module({
  providers: [WorkspaceService, WorkspaceRouter],
  exports: [WorkspaceService, WorkspaceRouter],
})
export class WorkspaceModule {}
