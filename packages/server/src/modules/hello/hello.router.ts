import { Logger } from "@nestjs/common";
import { Query, Router } from "../../trpc/decorators";

@Router({ alias: "hello" })
export class HelloRouter {
  private readonly logger = new Logger(HelloRouter.name);

  constructor() {
    this.logger.log("HelloRouter registered");
  }

  @Query()
  hello() {
    return { message: "Hello World" };
  }
}
