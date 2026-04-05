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
  private static readonly editableStatuses = new Set<PostStatus>([
    PostStatus.DRAFT,
    PostStatus.PUBLISHED,
  ]);
  static readonly creatableStatuses = new Set<PostStatus>([
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
    // We ask the repository for one extra row so the service can answer
    // `hasMore` without issuing a separate count query.
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
    const body = this.normalizeRequiredBody(input.body);
    this.ensureStatusAllowed(
      input.status,
      FeedService.creatableStatuses,
      "created",
    );

    const createdPost = await this.feedRepository.createPost({
      authorId: userId,
      body,
      visibility: input.visibility,
      status: input.status,
    });

    return this.toCreatedFeedPostDto(createdPost);
  }

  async getLatestDraft(userId: string): Promise<LatestFeedDraftDto> {
    const draft = await this.feedRepository.findLatestOwnedDraft(userId);

    return {
      draft: draft == null ? null : this.toLatestFeedDraftDto(draft),
    };
  }

  async updatePost(
    postId: string,
    userId: string,
    input: UpdateFeedPostDto,
  ): Promise<UpdatedFeedPostDto> {
    const body = this.normalizeRequiredBody(input.body);
    this.ensureOptionalStatusAllowed(input.status, "updated");

    const existingPost = await this.feedRepository.findOwnedEditablePostById(
      postId,
      userId,
    );

    if (!existingPost) {
      throw new NotFoundException("Editable post not found.");
    }

    const nextStatus = input.status ?? existingPost.status;
    const nextPublishedAt = this.resolvePublishedAt(existingPost, nextStatus);

    const updatedPost = await this.feedRepository.updateOwnedPost({
      postId,
      userId,
      body,
      visibility: input.visibility,
      status: nextStatus,
      publishedAt: nextPublishedAt,
    });

    return this.toUpdatedFeedPostDto(updatedPost);
  }

  async discardDraft(postId: string, userId: string): Promise<void> {
    const discarded = await this.feedRepository.archiveOwnedDraft(postId, userId);

    if (!discarded) {
      throw new NotFoundException("Draft not found.");
    }
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const deleted = await this.feedRepository.archiveOwnedPost(postId, userId);

    if (!deleted) {
      throw new NotFoundException("Post not found.");
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

  private normalizeRequiredBody(body: string): string {
    const normalizedBody = body.trim();

    if (normalizedBody.length === 0) {
      throw new BadRequestException("Prayer body is required.");
    }

    return normalizedBody;
  }

  private ensureStatusAllowed(
    status: PostStatus,
    allowedStatuses: ReadonlySet<PostStatus>,
    action: "created" | "updated",
  ): void {
    if (allowedStatuses.has(status)) {
      return;
    }

    throw new BadRequestException(
      `Only draft and published posts can be ${action}.`,
    );
  }

  private ensureOptionalStatusAllowed(
    status: PostStatus | undefined,
    action: "created" | "updated",
  ): void {
    if (status == null) {
      return;
    }

    this.ensureStatusAllowed(status, FeedService.editableStatuses, action);
  }

  private resolvePublishedAt(
    existingPost: {
      publishedAt: Date | null;
    },
    nextStatus: PostStatus,
  ): Date | null {
    // A published post should keep its first publish time. Drafts explicitly
    // clear the field so cursor ordering only includes visible feed items.
    if (nextStatus === PostStatus.DRAFT) {
      return null;
    }

    return existingPost.publishedAt ?? new Date();
  }

  private toCreatedFeedPostDto(post: {
    id: string;
    body: string;
    visibility: "PUBLIC" | "ANONYMOUS";
    status: PostStatus;
    createdAt: Date;
    publishedAt: Date | null;
  }): CreatedFeedPostDto {
    return {
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    };
  }

  private toLatestFeedDraftDto(draft: {
    id: string;
    body: string;
    visibility: "PUBLIC" | "ANONYMOUS";
    status: PostStatus;
    updatedAt: Date;
    createdAt: Date;
  }): NonNullable<LatestFeedDraftDto["draft"]> {
    return {
      id: draft.id,
      body: draft.body,
      visibility: draft.visibility,
      status: draft.status,
      updatedAt: draft.updatedAt.toISOString(),
      createdAt: draft.createdAt.toISOString(),
    };
  }

  private toUpdatedFeedPostDto(post: {
    id: string;
    body: string;
    visibility: "PUBLIC" | "ANONYMOUS";
    status: PostStatus;
    updatedAt: Date;
    publishedAt: Date | null;
  }): UpdatedFeedPostDto {
    return {
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      status: post.status,
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    };
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
