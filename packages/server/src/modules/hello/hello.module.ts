import { Module } from "@nestjs/common";
import { HelloRouter } from "./hello.router";

@Module({
  providers: [HelloRouter],
  exports: [HelloRouter],
})
export class HelloModule {}
