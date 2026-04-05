import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";

import type { FeedReactionStateDto, FeedResponseDto } from "./feed.dto";
import { GetFeedQueryDto, SetPostReactionDto } from "./feed.dto";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/jwt-auth.guard";
import { FeedService } from "./feed.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("v1/feed")
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  getFeed(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: GetFeedQueryDto,
  ): Promise<FeedResponseDto> {
    return this.feedService.getFeed({
      limit: query.limit,
      cursor: query.cursor,
      userId: user.sub,
    });
  }

  @Post(":postId/reactions")
  setPostReaction(
    @CurrentUser() user: AccessTokenPayload,
    @Param("postId") postId: string,
    @Body() body: SetPostReactionDto,
  ): Promise<FeedReactionStateDto> {
    return this.feedService.setPostReaction(postId, user.sub, body.type);
  }
}
