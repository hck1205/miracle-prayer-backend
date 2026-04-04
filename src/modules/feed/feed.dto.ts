import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class GetFeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;
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
  commentCount: number;
  publishedAt: string;
}

export interface FeedResponseDto {
  items: FeedItemDto[];
}
