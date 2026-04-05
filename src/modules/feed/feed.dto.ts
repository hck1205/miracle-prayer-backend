import { Type } from "class-transformer";
import { ReactionType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GetFeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class SetPostReactionDto {
  @IsEnum(ReactionType)
  type!: ReactionType;
}

export interface FeedReactionSummaryDto {
  LOVE: number;
  AMEN: number;
  WITH_YOU: number;
  PEACE: number;
  total: number;
}

export interface FeedItemDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  authorLabel: string;
  authorType: "HUMAN" | "AI";
  reactionCount: number;
  reactionSummary: FeedReactionSummaryDto;
  viewerReaction: ReactionType | null;
  commentCount: number;
  publishedAt: string;
}

export interface FeedResponseDto {
  items: FeedItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedReactionStateDto {
  postId: string;
  reactionCount: number;
  reactionSummary: FeedReactionSummaryDto;
  viewerReaction: ReactionType | null;
}
