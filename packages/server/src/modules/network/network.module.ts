import { Module } from "@nestjs/common";
import { NetworkPublicController } from "./network.public.controller";
import { NetworkService } from "./network.service";

@Module({
  providers: [NetworkService],
  controllers: [NetworkPublicController],
  exports: [NetworkService],
})
export class NetworkModule {}
