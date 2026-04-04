import { Injectable } from "@nestjs/common";
import { PostStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedFeed(limit: number) {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: limit,
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
}
