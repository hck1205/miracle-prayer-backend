import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import type { FeedResponseDto } from "./feed.dto";
import { GetFeedQueryDto } from "./feed.dto";
import { FeedService } from "./feed.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("v1/feed")
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  getFeed(@Query() query: GetFeedQueryDto): Promise<FeedResponseDto> {
    return this.feedService.getFeed(query.limit);
  }
}
