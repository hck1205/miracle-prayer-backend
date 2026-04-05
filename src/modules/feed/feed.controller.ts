import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import type {
  CreatedFeedPostDto,
  FeedReactionStateDto,
  FeedResponseDto,
  LatestFeedDraftDto,
  UpdatedFeedPostDto,
} from "./feed.dto";
import {
  CreateFeedPostDto,
  GetFeedQueryDto,
  SetPostReactionDto,
  UpdateFeedPostDto,
} from "./feed.dto";
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

  @Post()
  createPost(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: CreateFeedPostDto,
  ): Promise<CreatedFeedPostDto> {
    return this.feedService.createPost(user.sub, body);
  }

  @Get("drafts/latest")
  getLatestDraft(@CurrentUser() user: AccessTokenPayload): Promise<LatestFeedDraftDto> {
    return this.feedService.getLatestDraft(user.sub);
  }

  @Post(":postId")
  updatePost(
    @CurrentUser() user: AccessTokenPayload,
    @Param("postId") postId: string,
    @Body() body: UpdateFeedPostDto,
  ): Promise<UpdatedFeedPostDto> {
    return this.feedService.updatePost(postId, user.sub, body);
  }

  @Post(":postId/discard")
  @HttpCode(204)
  async discardDraft(
    @CurrentUser() user: AccessTokenPayload,
    @Param("postId") postId: string,
  ): Promise<void> {
    await this.feedService.discardDraft(postId, user.sub);
  }

  @Delete(":postId")
  @HttpCode(204)
  async deletePost(
    @CurrentUser() user: AccessTokenPayload,
    @Param("postId") postId: string,
  ): Promise<void> {
    await this.feedService.deletePost(postId, user.sub);
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
