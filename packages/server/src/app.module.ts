import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { createContext } from "./trpc/context";
import { TrpcModule } from "./trpc/trpc.module";
import { AdminModule } from "./modules/admin";
import { AuthModule } from "./modules/auth";
import { ClashModule } from "./modules/clash";
import { HelloModule } from "./modules/hello";
import { TestRequirementModule } from "./modules/test-requirement";
import { TodoModule } from "./modules/todo";
import { UserModule } from "./modules/user";
import { WorkspaceModule } from "./modules/workspace";
import { ClashPublicController } from "./modules/clash/clash.public.controller";
import { NetworkPublicController } from "./modules/network/network.public.controller";

@Module({
  imports: [
    TrpcModule.forRoot({
      createContext
    }),
    AdminModule,
    AuthModule,
    ClashModule,
    HelloModule,
    TestRequirementModule,
    TodoModule,
    UserModule,
    WorkspaceModule
  ],
  controllers: [AppController, ClashPublicController, NetworkPublicController]
})
export class AppModule {}
