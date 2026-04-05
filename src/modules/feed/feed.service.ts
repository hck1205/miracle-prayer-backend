import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ReactionType } from "@prisma/client";

import type {
  FeedItemDto,
  FeedReactionStateDto,
  FeedResponseDto,
} from "./feed.dto";
import { FeedRepository } from "./feed.repository";

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed({
    limit,
    cursor,
    userId,
  }: {
    limit: number;
    cursor?: string;
    userId: string;
  }): Promise<FeedResponseDto> {
    const decodedCursor = this.decodeCursor(cursor);
    const posts = await this.feedRepository.findPublishedFeed({
      limit,
      cursor: decodedCursor,
    });
    const hasMore = posts.length > limit;
    const pagePosts = hasMore ? posts.slice(0, limit) : posts;
    const reactionStates = await this.feedRepository.getFeedReactionStates(
      pagePosts.map((post) => ({
        id: post.id,
        reactionCount: post.reactionCount,
      })),
      userId,
    );
    const lastPost = pagePosts.length > 0 ? pagePosts[pagePosts.length - 1] : undefined;

    return {
      items: pagePosts.map<FeedItemDto>((post) => {
        const reactionState = reactionStates.get(post.id);

        return {
          id: post.id,
          body: post.body,
          visibility: post.visibility,
          authorLabel: "ANONYMOUS",
          authorType: post.author.userType,
          reactionCount: reactionState?.reactionCount ?? post.reactionCount,
          reactionSummary: reactionState?.reactionSummary ?? {
            LOVE: 0,
            AMEN: 0,
            WITH_YOU: 0,
            PEACE: 0,
            total: post.reactionCount,
          },
          viewerReaction: reactionState?.viewerReaction ?? null,
          commentCount: post.commentCount,
          publishedAt: post.publishedAt.toISOString(),
        };
      }),
      nextCursor: hasMore ? this.encodeCursor(lastPost?.publishedAt, lastPost?.id) : null,
      hasMore,
    };
  }

  async setPostReaction(
    postId: string,
    userId: string,
    type: ReactionType,
  ): Promise<FeedReactionStateDto> {
    const post = await this.feedRepository.findPublishedPostById(postId);

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    return this.feedRepository.setPostReaction(postId, userId, type);
  }

  private encodeCursor(publishedAt?: Date, id?: string): string | null {
    if (publishedAt == null || id == null) {
      return null;
    }

    return Buffer.from(
      JSON.stringify({
        publishedAt: publishedAt.toISOString(),
        id,
      }),
      "utf8",
    ).toString("base64url");
  }

  private decodeCursor(cursor?: string): { publishedAt: Date; id: string } | undefined {
    if (cursor == null || cursor.trim().length === 0) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
        publishedAt?: string;
        id?: string;
      };

      if (parsed.publishedAt == null || parsed.id == null) {
        throw new Error("Missing cursor fields");
      }

      return {
        publishedAt: new Date(parsed.publishedAt),
        id: parsed.id,
      };
    } catch {
      throw new BadRequestException("Invalid feed cursor.");
    }
  }
}
