import { Injectable } from "@nestjs/common";
import { PostStatus, Prisma, ReactionType } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import type { FeedReactionSummaryDto, FeedReactionStateDto } from "./feed.dto";

const EMPTY_REACTION_SUMMARY: FeedReactionSummaryDto = {
  LOVE: 0,
  AMEN: 0,
  WITH_YOU: 0,
  PEACE: 0,
  total: 0,
};

@Injectable()
export class FeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedFeed({
    limit,
    cursor,
  }: {
    limit: number;
    cursor?: {
      publishedAt: Date;
      id: string;
    };
  }) {
    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
      ...(cursor == null
          ? {}
          : {
              OR: [
                {
                  publishedAt: {
                    lt: cursor.publishedAt,
                  },
                },
                {
                  publishedAt: cursor.publishedAt,
                  id: {
                    lt: cursor.id,
                  },
                },
              ],
            }),
    };

    return this.prisma.post.findMany({
      where,
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: limit + 1,
      select: {
        id: true,
        body: true,
        visibility: true,
        reactionCount: true,
        commentCount: true,
        publishedAt: true,
        author: {
          select: {
            name: true,
            userType: true,
          },
        },
      },
    });
  }

  async findPublishedPostById(postId: string) {
    return this.prisma.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.PUBLISHED,
      },
      select: {
        id: true,
      },
    });
  }

  async getFeedReactionStates(
    posts: Array<{ id: string; reactionCount: number }>,
    userId: string,
  ): Promise<Map<string, FeedReactionStateDto>> {
    if (posts.length == 0) {
      return new Map<string, FeedReactionStateDto>();
    }

    const postIds = posts.map((post) => post.id);

    const [groupedCounts, viewerReactions] = await this.prisma.$transaction([
      this.prisma.postReaction.groupBy({
        by: ["postId", "type"],
        orderBy: [{ postId: "asc" }, { type: "asc" }],
        where: {
          postId: { in: postIds },
        },
        _count: {
          type: true,
        },
      }),
      this.prisma.postReaction.findMany({
        where: {
          postId: { in: postIds },
          userId,
        },
        select: {
          postId: true,
          type: true,
        },
      }),
    ]);

    const reactionStateMap = new Map<string, FeedReactionStateDto>();

    for (const post of posts) {
      reactionStateMap.set(post.id, {
        postId: post.id,
        reactionCount: post.reactionCount,
        reactionSummary: { ...EMPTY_REACTION_SUMMARY, total: post.reactionCount },
        viewerReaction: null,
      });
    }

    for (const row of groupedCounts) {
      const existing = reactionStateMap.get(row.postId);
      if (!existing) {
        continue;
      }

      const count =
        typeof row._count === "object" && row._count ? (row._count.type ?? 0) : 0;
      existing.reactionSummary[row.type] = count;
    }

    for (const reaction of viewerReactions) {
      const existing = reactionStateMap.get(reaction.postId);
      if (!existing) {
        continue;
      }

      existing.viewerReaction = reaction.type;
    }

    return reactionStateMap;
  }

  async setPostReaction(
    postId: string,
    userId: string,
    type: ReactionType,
  ): Promise<FeedReactionStateDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.postReaction.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        select: {
          id: true,
          type: true,
        },
      });

      let viewerReaction: ReactionType | null = type;

      if (!existing) {
        await tx.postReaction.create({
          data: {
            postId,
            userId,
            type,
          },
        });

        await tx.post.update({
          where: { id: postId },
          data: {
            reactionCount: {
              increment: 1,
            },
          },
        });
      } else if (existing.type === type) {
        await tx.postReaction.delete({
          where: { id: existing.id },
        });

        await tx.post.update({
          where: { id: postId },
          data: {
            reactionCount: {
              decrement: 1,
            },
          },
        });

        viewerReaction = null;
      } else {
        await tx.postReaction.update({
          where: { id: existing.id },
          data: { type },
        });
      }

      const [post, groupedCounts] = await Promise.all([
        tx.post.findUniqueOrThrow({
          where: { id: postId },
          select: {
            reactionCount: true,
          },
        }),
        tx.postReaction.groupBy({
          by: ["type"],
          orderBy: { type: "asc" },
          where: { postId },
          _count: {
            type: true,
          },
        }),
      ]);

      const reactionSummary: FeedReactionSummaryDto = {
        ...EMPTY_REACTION_SUMMARY,
        total: post.reactionCount,
      };

      for (const row of groupedCounts) {
        const count =
          typeof row._count === "object" && row._count
            ? (row._count.type ?? 0)
            : 0;
        reactionSummary[row.type] = count;
      }

      return {
        postId,
        reactionCount: post.reactionCount,
        reactionSummary,
        viewerReaction,
      };
    });
  }
}
