import type { User } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";

import { AuthRepository } from "./auth.repository";

describe("AuthRepository", () => {
  const existingUser = {
    id: "user-1",
    email: "bride@example.com",
    googleSubject: "google-subject-1",
    name: "Custom Name",
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
    userType: "HUMAN",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  let prismaService: {
    user: {
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let authRepository: AuthRepository;

  beforeEach(() => {
    prismaService = {
      user: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    authRepository = new AuthRepository(prismaService as unknown as PrismaService);
  });

  it("preserves the existing name when a returning Google user signs in again", async () => {
    prismaService.user.upsert.mockResolvedValue(existingUser);

    await expect(
      authRepository.upsertGoogleUser({
        email: existingUser.email,
        googleSubject: "google-subject-2",
        name: "Google Name",
      }),
    ).resolves.toBe(existingUser);

    expect(prismaService.user.upsert).toHaveBeenCalledWith({
      where: { email: existingUser.email },
      create: {
        email: existingUser.email,
        googleSubject: "google-subject-2",
        name: "Google Name",
      },
      update: {
        googleSubject: "google-subject-2",
      },
    });
  });

  it("trims whitespace and clears empty names on profile update", async () => {
    prismaService.user.update.mockResolvedValue({
      ...existingUser,
      name: null,
    });

    await authRepository.updateUserProfile({
      userId: existingUser.id,
      name: "   ",
    });

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: {
        name: null,
      },
    });
  });
});
