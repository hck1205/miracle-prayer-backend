import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FeedController } from "./feed.controller";
import { FeedRepository } from "./feed.repository";
import { FeedService } from "./feed.service";

@Module({
  imports: [AuthModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
})
export class FeedModule {}
