import { Module } from "@nestjs/common";
import { ProxyRouter } from "./proxy.router";
import { ProxySubscribeService, ProxyRuleService } from "./proxy.service";

@Module({
  providers: [ProxySubscribeService, ProxyRuleService, ProxyRouter],
  exports: [ProxySubscribeService, ProxyRuleService, ProxyRouter]
})
export class ProxyModule {}
