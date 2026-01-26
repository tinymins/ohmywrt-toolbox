import { Module } from "@nestjs/common";
import { NetworkService } from "./network.service";
import { NetworkPublicController } from "./network.public.controller";

@Module({
  providers: [NetworkService],
  controllers: [NetworkPublicController],
  exports: [NetworkService]
})
export class NetworkModule {}
