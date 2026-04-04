import { Type } from "class-transformer";
import { ReactionType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class GetFeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;
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
  bodyBase64?: string;
  bodyCodePoints?: number[];
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
}

export interface FeedReactionStateDto {
  postId: string;
  reactionCount: number;
  reactionSummary: FeedReactionSummaryDto;
  viewerReaction: ReactionType | null;
}
