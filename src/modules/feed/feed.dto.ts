import { Type } from "class-transformer";
import {
  ContentVisibility,
  PostReportReason,
  PostStatus,
  ReactionType,
} from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

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

export class ReportFeedPostDto {
  @IsEnum(PostReportReason)
  reason!: PostReportReason;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  details?: string;
}

export class CreateFeedPostDto {
  @IsString()
  body = "";

  @IsEnum(ContentVisibility)
  visibility: ContentVisibility = ContentVisibility.PUBLIC;

  @IsEnum(PostStatus)
  status: PostStatus = PostStatus.PUBLISHED;
}

export class UpdateFeedPostDto {
  @IsString()
  body = "";

  @IsEnum(ContentVisibility)
  visibility: ContentVisibility = ContentVisibility.PUBLIC;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
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
  viewerCanEdit: boolean;
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

export interface CreatedFeedPostDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  status: PostStatus;
  createdAt: string;
  publishedAt: string | null;
}

export interface UpdatedFeedPostDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  status: PostStatus;
  updatedAt: string;
  publishedAt: string | null;
}

export interface FeedDraftDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  status: PostStatus;
  updatedAt: string;
  createdAt: string;
}

export interface LatestFeedDraftDto {
  draft: FeedDraftDto | null;
}
