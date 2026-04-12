import { Injectable } from "@nestjs/common";
import {
  ContentVisibility,
  PostReportReason,
  PostStatus,
  PostType,
  Prisma,
  ReactionType,
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import type {
  FeedFavoriteStateDto,
  FeedReactionSummaryDto,
  FeedReactionStateDto,
} from "./feed.dto";

const FEED_POST_SELECT = Prisma.validator<Prisma.PostSelect>()({
  id: true,
  postNumber: true,
  authorId: true,
  body: true,
  visibility: true,
  type: true,
  reactionCount: true,
  commentCount: true,
  publishedAt: true,
  createdAt: true,
  author: {
    select: {
      email: true,
      name: true,
      userType: true,
    },
  },
});

const EMPTY_REACTION_SUMMARY: FeedReactionSummaryDto = {
  LOVE: 0,
  AMEN: 0,
  WITH_YOU: 0,
  PEACE: 0,
  total: 0,
};
const EDITABLE_POST_STATUSES = [PostStatus.DRAFT, PostStatus.PUBLISHED];

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
      publishedAt: {
        not: null,
      },
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
      select: FEED_POST_SELECT,
    });
  }

  async searchPublishedFeed({
    query,
    limit,
    cursor,
  }: {
    query: string;
    limit: number;
    cursor?: {
      publishedAt: Date;
      id: string;
    };
  }) {
    const searchTerms = query
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
      publishedAt: {
        not: null,
      },
      AND: searchTerms.map((term) => ({
        body: {
          contains: term,
          mode: "insensitive",
        },
      })),
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
      select: FEED_POST_SELECT,
    });
  }

  async findFavoritedFeed({
    limit,
    cursor,
    userId,
  }: {
    limit: number;
    cursor?: {
      createdAt: Date;
      id: string;
    };
    userId: string;
  }) {
    return this.prisma.postFavorite.findMany({
      where: {
        userId,
        post: {
          status: PostStatus.PUBLISHED,
          publishedAt: {
            not: null,
          },
        },
        ...(cursor == null
          ? {}
          : {
              OR: [
                {
                  createdAt: {
                    lt: cursor.createdAt,
                  },
                },
                {
                  createdAt: cursor.createdAt,
                  id: {
                    lt: cursor.id,
                  },
                },
              ],
            }),
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        post: {
          select: FEED_POST_SELECT,
        },
      },
    });
  }

  async findPublishedUrgentFeed(limit: number) {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        type: PostType.URGENT,
        publishedAt: {
          not: null,
        },
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: limit,
      select: FEED_POST_SELECT,
    });
  }

  async findPublishedPostById(postId: string) {
    return this.prisma.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.PUBLISHED,
        publishedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        authorId: true,
      },
    });
  }

  async findOwnedEditablePostById(postId: string, userId: string) {
    return this.prisma.post.findFirst({
      where: {
        id: postId,
        authorId: userId,
        status: {
          in: EDITABLE_POST_STATUSES,
        },
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        type: true,
      },
    });
  }

  async findLatestOwnedDraft(userId: string) {
    return this.prisma.post.findFirst({
      where: {
        authorId: userId,
        status: PostStatus.DRAFT,
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        body: true,
        visibility: true,
        status: true,
        type: true,
        updatedAt: true,
        createdAt: true,
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
        reactionSummary: this.createReactionSummary(post.reactionCount),
        viewerReaction: null,
      });
    }

    for (const row of groupedCounts) {
      const existing = reactionStateMap.get(row.postId);
      if (!existing) {
        continue;
      }

      const count =
        typeof row._count === "object" && row._count
          ? (row._count.type ?? 0)
          : 0;
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

  async getFeedFavoriteStates(
    posts: Array<{ id: string }>,
    userId: string,
  ): Promise<Map<string, FeedFavoriteStateDto>> {
    if (posts.length == 0) {
      return new Map<string, FeedFavoriteStateDto>();
    }

    const favorites = await this.prisma.postFavorite.findMany({
      where: {
        postId: {
          in: posts.map((post) => post.id),
        },
        userId,
      },
      select: {
        postId: true,
      },
    });

    return new Map<string, FeedFavoriteStateDto>(
      favorites.map((favorite) => [
        favorite.postId,
        {
          postId: favorite.postId,
          viewerHasFavorited: true,
        },
      ]),
    );
  }

  async createPost({
    authorId,
    body,
    visibility,
    status,
    type,
  }: {
    authorId: string;
    body: string;
    visibility: ContentVisibility;
    status: PostStatus;
    type?: PostType | null;
  }) {
    return this.prisma.post.create({
      data: {
        authorId,
        body,
        visibility,
        status,
        type,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      },
      select: {
        id: true,
        body: true,
        visibility: true,
        status: true,
        type: true,
        createdAt: true,
        publishedAt: true,
      },
    });
  }

  async updateOwnedPost({
    postId,
    userId,
    body,
    visibility,
    status,
    publishedAt,
    type,
  }: {
    postId: string;
    userId: string;
    body: string;
    visibility: ContentVisibility;
    status?: PostStatus;
    publishedAt?: Date | null;
    type?: PostType | null;
  }) {
    await this.prisma.post.updateMany({
      where: {
        id: postId,
        authorId: userId,
        status: {
          in: EDITABLE_POST_STATUSES,
        },
      },
      data: {
        body,
        visibility,
        ...(status == null ? {} : { status }),
        ...(publishedAt === undefined ? {} : { publishedAt }),
        ...(type === undefined ? {} : { type }),
      },
    });

    return this.prisma.post.findUniqueOrThrow({
      where: {
        id: postId,
      },
      select: {
        id: true,
        body: true,
        visibility: true,
        status: true,
        type: true,
        updatedAt: true,
        publishedAt: true,
      },
    });
  }

  async archiveOwnedDraft(postId: string, userId: string) {
    const result = await this.prisma.post.updateMany({
      where: {
        id: postId,
        authorId: userId,
        status: PostStatus.DRAFT,
      },
      data: {
        status: PostStatus.ARCHIVED,
      },
    });

    return result.count > 0;
  }

  async archiveOwnedPost(postId: string, userId: string) {
    const result = await this.prisma.post.updateMany({
      where: {
        id: postId,
        authorId: userId,
        status: {
          in: EDITABLE_POST_STATUSES,
        },
      },
      data: {
        status: PostStatus.ARCHIVED,
        publishedAt: null,
        deletedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  async findPostReportByReporter(postId: string, reporterId: string) {
    return this.prisma.postReport.findUnique({
      where: {
        postId_reporterId: {
          postId,
          reporterId,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async findMostRecentPublishedUrgentPostByAuthor({
    userId,
    since,
    excludePostId,
  }: {
    userId: string;
    since: Date;
    excludePostId?: string;
  }) {
    return this.prisma.post.findFirst({
      where: {
        authorId: userId,
        status: PostStatus.PUBLISHED,
        type: PostType.URGENT,
        publishedAt: {
          not: null,
          gte: since,
        },
        ...(excludePostId == null
          ? {}
          : {
              id: {
                not: excludePostId,
              },
            }),
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        publishedAt: true,
      },
    });
  }

  async upsertPostReport({
    postId,
    reporterId,
    reason,
    details,
  }: {
    postId: string;
    reporterId: string;
    reason: PostReportReason;
    details?: string;
  }): Promise<void> {
    await this.prisma.postReport.upsert({
      where: {
        postId_reporterId: {
          postId,
          reporterId,
        },
      },
      update: {
        reason,
        details,
      },
      create: {
        postId,
        reporterId,
        reason,
        details,
      },
    });
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

      const reactionSummary = this.createReactionSummary(post.reactionCount);

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

  async togglePostFavorite(
    postId: string,
    userId: string,
  ): Promise<FeedFavoriteStateDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.postFavorite.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        await tx.postFavorite.delete({
          where: {
            id: existing.id,
          },
        });

        return {
          postId,
          viewerHasFavorited: false,
        };
      }

      await tx.postFavorite.create({
        data: {
          postId,
          userId,
        },
      });

      return {
        postId,
        viewerHasFavorited: true,
      };
    });
  }

  private createReactionSummary(total: number): FeedReactionSummaryDto {
    return {
      ...EMPTY_REACTION_SUMMARY,
      total,
    };
  }
}
