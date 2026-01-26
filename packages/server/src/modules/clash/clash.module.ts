import { Module } from "@nestjs/common";
import { ClashRouter } from "./clash.router";
import { ClashSubscribeService, ClashRuleService } from "./clash.service";

@Module({
  providers: [ClashSubscribeService, ClashRuleService, ClashRouter],
  exports: [ClashSubscribeService, ClashRuleService, ClashRouter]
})
export class ClashModule {}
