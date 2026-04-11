import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PostReportReason,
  PostStatus,
  PostType,
  ReactionType,
} from "@prisma/client";

import type {
  CreatedFeedPostDto,
  CreateFeedPostDto,
  FeedFavoriteStateDto,
  FeedItemDto,
  FeedReactionStateDto,
  FeedResponseDto,
  FeedUrgentEligibilityDto,
  LatestFeedDraftDto,
  UpdatedFeedPostDto,
  UpdateFeedPostDto,
} from "./feed.dto";
import { FEED_DEFAULTS, FEED_ENV_KEYS } from "./feed.constants";
import { FeedRepository } from "./feed.repository";

@Injectable()
export class FeedService {
  private static readonly publishedEditWindowMs = 60 * 60 * 1000;
  private static readonly editableStatuses = new Set<PostStatus>([
    PostStatus.DRAFT,
    PostStatus.PUBLISHED,
  ]);
  static readonly creatableStatuses = new Set<PostStatus>([
    PostStatus.DRAFT,
    PostStatus.PUBLISHED,
  ]);
  private urgentCooldownSeconds?: number;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly configService: ConfigService,
  ) {}

  async getFeed({
    limit,
    cursor,
    userId,
  }: {
    limit: number;
    cursor?: string;
    userId: string;
  }): Promise<FeedResponseDto> {
    const decodedCursor = this.decodePublishedCursor(cursor);
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
    const favoriteStates = await this.feedRepository.getFeedFavoriteStates(
      pagePosts.map((post) => ({
        id: post.id,
      })),
      userId,
    );
    const lastPost =
      pagePosts.length > 0 ? pagePosts[pagePosts.length - 1] : undefined;

    return {
      items: pagePosts.map<FeedItemDto>((post) =>
        this.toFeedItemDto(
          post,
          userId,
          reactionStates.get(post.id),
          favoriteStates.get(post.id),
        ),
      ),
      nextCursor: hasMore
        ? this.encodePublishedCursor(
            lastPost?.publishedAt ?? lastPost?.createdAt,
            lastPost?.id,
          )
        : null,
      hasMore,
    };
  }

  async getFavorites({
    limit,
    cursor,
    userId,
  }: {
    limit: number;
    cursor?: string;
    userId: string;
  }): Promise<FeedResponseDto> {
    const decodedCursor = this.decodeFavoriteCursor(cursor);
    const favorites = await this.feedRepository.findFavoritedFeed({
      limit,
      cursor: decodedCursor,
      userId,
    });
    const hasMore = favorites.length > limit;
    const pageFavorites = hasMore ? favorites.slice(0, limit) : favorites;
    const posts = pageFavorites.map((favorite) => favorite.post);
    const reactionStates = await this.feedRepository.getFeedReactionStates(
      posts.map((post) => ({
        id: post.id,
        reactionCount: post.reactionCount,
      })),
      userId,
    );
    const favoriteStates = new Map<string, FeedFavoriteStateDto>(
      posts.map((post) => [
        post.id,
        {
          postId: post.id,
          viewerHasFavorited: true,
        },
      ]),
    );
    const lastFavorite =
      pageFavorites.length > 0
        ? pageFavorites[pageFavorites.length - 1]
        : undefined;

    return {
      items: posts.map<FeedItemDto>((post) =>
        this.toFeedItemDto(
          post,
          userId,
          reactionStates.get(post.id),
          favoriteStates.get(post.id),
        ),
      ),
      nextCursor: hasMore
        ? this.encodeFavoriteCursor(lastFavorite?.createdAt, lastFavorite?.id)
        : null,
      hasMore,
    };
  }

  async getUrgentFeed({
    limit,
    userId,
  }: {
    limit: number;
    userId: string;
  }): Promise<FeedResponseDto> {
    const posts = await this.feedRepository.findPublishedUrgentFeed(limit);
    const reactionStates = await this.feedRepository.getFeedReactionStates(
      posts.map((post) => ({
        id: post.id,
        reactionCount: post.reactionCount,
      })),
      userId,
    );
    const favoriteStates = await this.feedRepository.getFeedFavoriteStates(
      posts.map((post) => ({
        id: post.id,
      })),
      userId,
    );

    return {
      items: posts.map<FeedItemDto>((post) =>
        this.toFeedItemDto(
          post,
          userId,
          reactionStates.get(post.id),
          favoriteStates.get(post.id),
        ),
      ),
      nextCursor: null,
      hasMore: false,
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
    const type = input.type ?? null;

    if (input.status === PostStatus.PUBLISHED) {
      await this.assertUrgentTypeAllowed({
        userId,
        type,
      });
    }

    const createdPost = await this.feedRepository.createPost({
      authorId: userId,
      body,
      visibility: input.visibility,
      status: input.status,
      type,
    });

    return this.toCreatedFeedPostDto(createdPost);
  }

  async getLatestDraft(userId: string): Promise<LatestFeedDraftDto> {
    const draft = await this.feedRepository.findLatestOwnedDraft(userId);

    return {
      draft: draft == null ? null : this.toLatestFeedDraftDto(draft),
    };
  }

  async getUrgentEligibility({
    userId,
    excludePostId,
  }: {
    userId: string;
    excludePostId?: string;
  }): Promise<FeedUrgentEligibilityDto> {
    const cooldownSeconds = this.getUrgentCooldownSeconds();
    const recentUrgent =
      await this.feedRepository.findMostRecentPublishedUrgentPostByAuthor({
        userId,
        since: new Date(Date.now() - cooldownSeconds * 1000),
        excludePostId,
      });

    if (recentUrgent?.publishedAt == null) {
      return {
        canUseUrgent: true,
        cooldownSeconds,
        nextAvailableAt: null,
      };
    }

    return {
      canUseUrgent: false,
      cooldownSeconds,
      nextAvailableAt: new Date(
        recentUrgent.publishedAt.getTime() + cooldownSeconds * 1000,
      ).toISOString(),
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

    this.ensurePostIsStillEditable(existingPost);

    const nextStatus = input.status ?? existingPost.status;
    const nextType =
      input.type === undefined ? existingPost.type : (input.type ?? null);
    if (nextStatus === PostStatus.PUBLISHED) {
      await this.assertUrgentTypeAllowed({
        userId,
        type: nextType,
        excludePostId: postId,
      });
    }
    const nextPublishedAt = this.resolvePublishedAt(existingPost, nextStatus);

    const updatedPost = await this.feedRepository.updateOwnedPost({
      postId,
      userId,
      body,
      visibility: input.visibility,
      status: nextStatus,
      publishedAt: nextPublishedAt,
      type: nextType,
    });

    return this.toUpdatedFeedPostDto(updatedPost);
  }

  async discardDraft(postId: string, userId: string): Promise<void> {
    const discarded = await this.feedRepository.archiveOwnedDraft(
      postId,
      userId,
    );

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

  async reportPost(
    postId: string,
    userId: string,
    reason: PostReportReason,
    details?: string,
  ): Promise<void> {
    const post = await this.feedRepository.findPublishedPostById(postId);

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    if (post.authorId === userId) {
      throw new BadRequestException("You can't report your own prayer.");
    }

    const existingReport = await this.feedRepository.findPostReportByReporter(
      postId,
      userId,
    );
    if (existingReport != null) {
      throw new BadRequestException("You already reported this prayer.");
    }

    const normalizedDetails = details?.trim();
    if (reason === PostReportReason.OTHER && !normalizedDetails) {
      throw new BadRequestException(
        "Please tell us why you're reporting this post.",
      );
    }

    await this.feedRepository.upsertPostReport({
      postId,
      reporterId: userId,
      reason,
      details:
        normalizedDetails != null && normalizedDetails.length > 0
          ? normalizedDetails
          : undefined,
    });
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

  async togglePostFavorite(
    postId: string,
    userId: string,
  ): Promise<FeedFavoriteStateDto> {
    const post = await this.feedRepository.findPublishedPostById(postId);

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    if (post.authorId === userId) {
      throw new BadRequestException("You can't favorite your own prayer.");
    }

    return this.feedRepository.togglePostFavorite(postId, userId);
  }

  private normalizeRequiredBody(body: string): string {
    const normalizedBody = body.trim();

    if (normalizedBody.length === 0) {
      throw new BadRequestException("Prayer body is required.");
    }

    return normalizedBody;
  }

  private async assertUrgentTypeAllowed({
    userId,
    type,
    excludePostId,
  }: {
    userId: string;
    type: PostType | null;
    excludePostId?: string;
  }): Promise<void> {
    if (type !== PostType.URGENT) {
      return;
    }

    const urgentEligibility = await this.getUrgentEligibility({
      userId,
      excludePostId,
    });

    if (urgentEligibility.canUseUrgent) {
      return;
    }

    throw new BadRequestException(
      `You can only mark one prayer as urgent once every ${this.describeUrgentCooldown()}.`,
    );
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

  private ensurePostIsStillEditable(existingPost: {
    status: PostStatus;
    publishedAt: Date | null;
  }): void {
    if (existingPost.status !== PostStatus.PUBLISHED) {
      return;
    }

    const publishedAt = existingPost.publishedAt;
    if (publishedAt == null) {
      return;
    }

    if (
      Date.now() - publishedAt.getTime() <=
      FeedService.publishedEditWindowMs
    ) {
      return;
    }

    throw new BadRequestException(
      "You can only edit a prayer within 1 hour of posting it.",
    );
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
    type: PostType | null;
    createdAt: Date;
    publishedAt: Date | null;
  }): CreatedFeedPostDto {
    return {
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      status: post.status,
      type: post.type,
      createdAt: post.createdAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    };
  }

  private toLatestFeedDraftDto(draft: {
    id: string;
    body: string;
    visibility: "PUBLIC" | "ANONYMOUS";
    status: PostStatus;
    type: PostType | null;
    updatedAt: Date;
    createdAt: Date;
  }): NonNullable<LatestFeedDraftDto["draft"]> {
    return {
      id: draft.id,
      body: draft.body,
      visibility: draft.visibility,
      status: draft.status,
      type: draft.type,
      updatedAt: draft.updatedAt.toISOString(),
      createdAt: draft.createdAt.toISOString(),
    };
  }

  private toUpdatedFeedPostDto(post: {
    id: string;
    body: string;
    visibility: "PUBLIC" | "ANONYMOUS";
    status: PostStatus;
    type: PostType | null;
    updatedAt: Date;
    publishedAt: Date | null;
  }): UpdatedFeedPostDto {
    return {
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      status: post.status,
      type: post.type,
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    };
  }

  private toFeedItemDto(
    post: {
      id: string;
      postNumber: number;
      authorId: string;
      body: string;
      visibility: "PUBLIC" | "ANONYMOUS";
      type: PostType | null;
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
    favoriteState?: FeedFavoriteStateDto,
  ): FeedItemDto {
    const authorName = post.author.name?.trim();

    return {
      id: post.id,
      postNumber: post.postNumber,
      body: post.body,
      visibility: post.visibility,
      type: post.type,
      viewerCanEdit: post.authorId === userId,
      viewerHasFavorited: favoriteState?.viewerHasFavorited ?? false,
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

  private encodePublishedCursor(
    publishedAt?: Date,
    id?: string,
  ): string | null {
    if (publishedAt == null || id == null) {
      return null;
    }

    return this.encodeCursor({
      publishedAt: publishedAt.toISOString(),
      id,
    });
  }

  private decodePublishedCursor(
    cursor?: string,
  ): { publishedAt: Date; id: string } | undefined {
    if (cursor == null || cursor.trim().length === 0) {
      return undefined;
    }

    try {
      const parsed = this.decodeCursor(cursor) as {
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

  private encodeFavoriteCursor(createdAt?: Date, id?: string): string | null {
    if (createdAt == null || id == null) {
      return null;
    }

    return this.encodeCursor({
      createdAt: createdAt.toISOString(),
      id,
    });
  }

  private decodeFavoriteCursor(
    cursor?: string,
  ): { createdAt: Date; id: string } | undefined {
    if (cursor == null || cursor.trim().length === 0) {
      return undefined;
    }

    try {
      const parsed = this.decodeCursor(cursor) as {
        createdAt?: string;
        id?: string;
      };

      if (parsed.createdAt == null || parsed.id == null) {
        throw new Error("Missing cursor fields");
      }

      return {
        createdAt: new Date(parsed.createdAt),
        id: parsed.id,
      };
    } catch {
      throw new BadRequestException("Invalid favorites cursor.");
    }
  }

  private encodeCursor(value: Record<string, string>): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  }

  private decodeCursor(cursor: string): unknown {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  }

  private getUrgentCooldownSeconds(): number {
    this.urgentCooldownSeconds ??= this.getPositiveConfigNumber(
      FEED_ENV_KEYS.urgentCooldownSeconds,
      FEED_DEFAULTS.urgentCooldownSeconds,
    );
    return this.urgentCooldownSeconds;
  }

  private getPositiveConfigNumber(
    key: string,
    fallback: string | number,
  ): number {
    const rawValue = this.configService.get<string>(key) ?? fallback;
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      throw new Error(`${key} must be a positive number in seconds.`);
    }

    return parsedValue;
  }

  private describeUrgentCooldown(): string {
    const cooldownSeconds = this.getUrgentCooldownSeconds();
    const secondsPerDay = 24 * 60 * 60;
    const secondsPerHour = 60 * 60;

    if (cooldownSeconds % secondsPerDay === 0) {
      const days = Math.floor(cooldownSeconds / secondsPerDay);
      return days === 1 ? "1 day" : `${days} days`;
    }

    if (cooldownSeconds % secondsPerHour === 0) {
      const hours = Math.floor(cooldownSeconds / secondsPerHour);
      return hours === 1 ? "1 hour" : `${hours} hours`;
    }

    if (cooldownSeconds % 60 === 0) {
      const minutes = Math.floor(cooldownSeconds / 60);
      return minutes === 1 ? "1 minute" : `${minutes} minutes`;
    }

    return cooldownSeconds === 1 ? "1 second" : `${cooldownSeconds} seconds`;
  }
}
