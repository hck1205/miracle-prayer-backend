import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PostStatus, ReactionType } from "@prisma/client";

import type {
  CreatedFeedPostDto,
  CreateFeedPostDto,
  FeedItemDto,
  FeedReactionStateDto,
  FeedResponseDto,
  LatestFeedDraftDto,
  UpdatedFeedPostDto,
  UpdateFeedPostDto,
} from "./feed.dto";
import { FeedRepository } from "./feed.repository";

@Injectable()
export class FeedService {
  static readonly creatableStatuses = new Set<PostStatus>([
    PostStatus.DRAFT,
    PostStatus.PUBLISHED,
  ]);
  static readonly updatableStatuses = new Set<PostStatus>([
    PostStatus.DRAFT,
    PostStatus.PUBLISHED,
  ]);

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
      items: pagePosts.map<FeedItemDto>(
        (post) => this.toFeedItemDto(post, userId, reactionStates.get(post.id)),
      ),
      nextCursor: hasMore
          ? this.encodeCursor(lastPost?.publishedAt ?? lastPost?.createdAt, lastPost?.id)
          : null,
      hasMore,
    };
  }

  async createPost(
    userId: string,
    input: CreateFeedPostDto,
  ): Promise<CreatedFeedPostDto> {
    const body = input.body.trim();

    if (body.length === 0) {
      throw new BadRequestException("Prayer body is required.");
    }

    if (!FeedService.creatableStatuses.has(input.status)) {
      throw new BadRequestException("Only draft and published posts can be created.");
    }

    const createdPost = await this.feedRepository.createPost({
      authorId: userId,
      body,
      visibility: input.visibility,
      status: input.status,
    });

    return {
      id: createdPost.id,
      body: createdPost.body,
      visibility: createdPost.visibility,
      status: createdPost.status,
      createdAt: createdPost.createdAt.toISOString(),
      publishedAt: createdPost.publishedAt?.toISOString() ?? null,
    };
  }

  async getLatestDraft(userId: string): Promise<LatestFeedDraftDto> {
    const draft = await this.feedRepository.findLatestOwnedDraft(userId);

    return {
      draft:
        draft == null
            ? null
            : {
                id: draft.id,
                body: draft.body,
                visibility: draft.visibility,
                status: draft.status,
                updatedAt: draft.updatedAt.toISOString(),
                createdAt: draft.createdAt.toISOString(),
              },
    };
  }

  async updatePost(
    postId: string,
    userId: string,
    input: UpdateFeedPostDto,
  ): Promise<UpdatedFeedPostDto> {
    const body = input.body.trim();

    if (body.length === 0) {
      throw new BadRequestException("Prayer body is required.");
    }

    if (input.status != null && !FeedService.updatableStatuses.has(input.status)) {
      throw new BadRequestException("Only draft and published posts can be updated.");
    }

    const existingPost = await this.feedRepository.findOwnedEditablePostById(
      postId,
      userId,
    );

    if (!existingPost) {
      throw new NotFoundException("Editable post not found.");
    }

    const nextStatus = input.status ?? existingPost.status;
    const nextPublishedAt =
      nextStatus === PostStatus.DRAFT
        ? null
        : existingPost.publishedAt ?? new Date();

    const updatedPost = await this.feedRepository.updateOwnedPost({
      postId,
      userId,
      body,
      visibility: input.visibility,
      status: nextStatus,
      publishedAt: nextPublishedAt,
    });

    return {
      id: updatedPost.id,
      body: updatedPost.body,
      visibility: updatedPost.visibility,
      status: updatedPost.status,
      updatedAt: updatedPost.updatedAt.toISOString(),
      publishedAt: updatedPost.publishedAt?.toISOString() ?? null,
    };
  }

  async discardDraft(postId: string, userId: string): Promise<void> {
    const discarded = await this.feedRepository.archiveOwnedDraft(postId, userId);

    if (!discarded) {
      throw new NotFoundException("Draft not found.");
    }
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

  private toFeedItemDto(
    post: {
      id: string;
      authorId: string;
      body: string;
      visibility: "PUBLIC" | "ANONYMOUS";
      reactionCount: number;
      commentCount: number;
      publishedAt: Date | null;
      createdAt: Date;
      author: {
        email: string;
        name: string | null;
        userType: "HUMAN" | "AI";
      };
    },
    userId: string,
    reactionState?: FeedReactionStateDto,
  ): FeedItemDto {
    const authorName = post.author.name?.trim();

    return {
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      viewerCanEdit: post.authorId === userId,
      authorLabel:
        post.visibility === "ANONYMOUS"
          ? "ANONYMOUS"
          : authorName != null && authorName.length > 0
            ? authorName
            : post.author.email,
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
      publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    };
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
