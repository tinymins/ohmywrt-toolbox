import { Module } from "@nestjs/common";
import { TodoRouter } from "./todo.router";
import { TodoService } from "./todo.service";

@Module({
  providers: [TodoService, TodoRouter],
  exports: [TodoService, TodoRouter],
})
export class TodoModule {}
