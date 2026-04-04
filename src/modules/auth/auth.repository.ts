import { Injectable } from "@nestjs/common";
import { Prisma, type User } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user for a verified Google account or links Google identity to an existing email.
   */
  async upsertGoogleUser(params: {
    email: string;
    googleSubject: string;
    name: string | null;
  }): Promise<User> {
    const { email, googleSubject, name } = params;
    const createData: Prisma.UserCreateInput = {
      email,
      googleSubject,
      name,
    };
    const updateData: Prisma.UserUpdateInput = {
      googleSubject,
      name,
    };

    return this.prisma.user.upsert({
      where: { email },
      create: createData,
      update: updateData,
    });
  }

  /**
   * Loads the authenticated user by the identifier stored in the JWT payload.
   */
  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updateRefreshToken(params: {
    userId: string;
    refreshTokenHash: string | null;
    refreshTokenExpiresAt: Date | null;
  }): Promise<User> {
    const { refreshTokenExpiresAt, refreshTokenHash, userId } = params;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }
}
