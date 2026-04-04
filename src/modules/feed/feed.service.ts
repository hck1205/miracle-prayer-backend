import { Injectable } from "@nestjs/common";

import type { FeedItemDto, FeedResponseDto } from "./feed.dto";
import { FeedRepository } from "./feed.repository";

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(limit: number): Promise<FeedResponseDto> {
    const posts = await this.feedRepository.findPublishedFeed(limit);

    return {
      items: posts.map<FeedItemDto>((post) => ({
        id: post.id,
        body: post.body,
        bodyBase64: Buffer.from(post.body, "utf8").toString("base64"),
        bodyCodePoints: Array.from(post.body).map((character) =>
          character.codePointAt(0) ?? 63,
        ),
        visibility: post.visibility,
        authorLabel: "ANONYMOUS",
        authorType: post.author.userType,
        reactionCount: post.reactionCount,
        commentCount: post.commentCount,
        publishedAt: post.publishedAt.toISOString(),
      })),
    };
  }
}
