import { Module } from "@nestjs/common";
import { TestRequirementRouter } from "./test-requirement.router";
import { TestRequirementService } from "./test-requirement.service";

@Module({
  providers: [TestRequirementService, TestRequirementRouter],
  exports: [TestRequirementService, TestRequirementRouter],
})
export class TestRequirementModule {}
