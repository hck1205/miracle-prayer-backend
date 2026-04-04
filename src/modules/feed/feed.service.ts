import { Injectable, NotFoundException } from "@nestjs/common";
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

  async getFeed(limit: number, userId: string): Promise<FeedResponseDto> {
    const posts = await this.feedRepository.findPublishedFeed(limit);
    const reactionStates = await this.feedRepository.getFeedReactionStates(
      posts.map((post) => post.id),
      userId,
    );

    return {
      items: posts.map<FeedItemDto>((post) => {
        const reactionState = reactionStates.get(post.id);

        return {
          id: post.id,
          body: post.body,
          bodyBase64: Buffer.from(post.body, "utf8").toString("base64"),
          bodyCodePoints: Array.from(post.body).map((character) =>
            character.codePointAt(0) ?? 63,
          ),
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
}
