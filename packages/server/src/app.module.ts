import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { createContext } from "./trpc/context";
import { TrpcModule } from "./trpc/trpc.module";
import { AdminModule } from "./modules/admin";
import { AuthModule } from "./modules/auth";
import { HelloModule } from "./modules/hello";
import { TestRequirementModule } from "./modules/test-requirement";
import { TodoModule } from "./modules/todo";
import { UserModule } from "./modules/user";
import { WorkspaceModule } from "./modules/workspace";

@Module({
  imports: [
    TrpcModule.forRoot({
      createContext
    }),
    AdminModule,
    AuthModule,
    HelloModule,
    TestRequirementModule,
    TodoModule,
    UserModule,
    WorkspaceModule
  ],
  controllers: [AppController]
})
export class AppModule {}
