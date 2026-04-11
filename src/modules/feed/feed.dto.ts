import { Type } from "class-transformer";
import {
  ContentVisibility,
  PostReportReason,
  PostStatus,
  PostType,
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
  ValidateIf,
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

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(PostType)
  type?: PostType | null;
}

export class UpdateFeedPostDto {
  @IsString()
  body = "";

  @IsEnum(ContentVisibility)
  visibility: ContentVisibility = ContentVisibility.PUBLIC;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(PostType)
  type?: PostType | null;
}

export class GetUrgentEligibilityQueryDto {
  @IsOptional()
  @IsString()
  excludePostId?: string;
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
  postNumber: number;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  type: PostType | null;
  viewerCanEdit: boolean;
  viewerHasFavorited: boolean;
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

export interface FeedFavoriteStateDto {
  postId: string;
  viewerHasFavorited: boolean;
}

export interface CreatedFeedPostDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  status: PostStatus;
  type: PostType | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface UpdatedFeedPostDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  status: PostStatus;
  type: PostType | null;
  updatedAt: string;
  publishedAt: string | null;
}

export interface FeedDraftDto {
  id: string;
  body: string;
  visibility: "PUBLIC" | "ANONYMOUS";
  status: PostStatus;
  type: PostType | null;
  updatedAt: string;
  createdAt: string;
}

export interface LatestFeedDraftDto {
  draft: FeedDraftDto | null;
}

export interface FeedUrgentEligibilityDto {
  canUseUrgent: boolean;
  cooldownSeconds: number;
  nextAvailableAt: string | null;
}
