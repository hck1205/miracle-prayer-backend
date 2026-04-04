import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "crypto";

import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import type { VerifiedGoogleUser } from "./google-auth.client";
import { GoogleAuthClient } from "./google-auth.client";

describe("AuthService", () => {
  const verifiedGoogleUser: VerifiedGoogleUser = {
    googleSubject: "google-subject-123",
    email: "bride@example.com",
    name: "Bride",
  };

  const persistedUser = {
    id: "user-1",
    email: verifiedGoogleUser.email,
    name: verifiedGoogleUser.name,
    googleSubject: verifiedGoogleUser.googleSubject,
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let authRepository: jest.Mocked<AuthRepository>;
  let googleAuthClient: jest.Mocked<GoogleAuthClient>;
  let jwtService: jest.Mocked<JwtService>;
  let authService: AuthService;

  beforeEach(() => {
    authRepository = {
      upsertGoogleUser: jest.fn(),
      findUserById: jest.fn(),
      updateRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    googleAuthClient = {
      verifyIdToken: jest.fn(),
    } as unknown as jest.Mocked<GoogleAuthClient>;
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(
      authRepository,
      googleAuthClient,
      jwtService,
      new ConfigService({
        JWT_ACCESS_EXPIRES_IN: "900",
        JWT_REFRESH_SECRET: "refresh-secret",
        JWT_REFRESH_EXPIRES_IN: String(60 * 60 * 24 * 7),
      }),
    );
  });

  it("returns a token pair and user profile after Google login", async () => {
    googleAuthClient.verifyIdToken.mockResolvedValue(verifiedGoogleUser);
    authRepository.upsertGoogleUser.mockResolvedValue(persistedUser as never);
    authRepository.updateRefreshToken.mockResolvedValue(persistedUser as never);
    jwtService.signAsync
      .mockResolvedValueOnce("signed-access-token")
      .mockResolvedValueOnce("signed-refresh-token");

    await expect(authService.loginWithGoogle("google-id-token")).resolves.toEqual({
      accessToken: "signed-access-token",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "signed-refresh-token",
      refreshExpiresIn: 604800,
      user: {
        id: persistedUser.id,
        email: persistedUser.email,
        name: persistedUser.name,
      },
    });
  });

  it("rotates the refresh token and persists the new hash", async () => {
    const currentRefreshToken = "current-refresh-token";
    const storedUser = {
      ...persistedUser,
      refreshTokenHash: createHash("sha256").update(currentRefreshToken).digest("hex"),
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: persistedUser.id,
      type: "refresh",
      jti: "token-1",
    } as never);
    authRepository.findUserById.mockResolvedValue(storedUser as never);
    authRepository.updateRefreshToken.mockResolvedValue(storedUser as never);
    jwtService.signAsync
      .mockResolvedValueOnce("rotated-access-token")
      .mockResolvedValueOnce("rotated-refresh-token");

    await expect(authService.rotateRefreshToken(currentRefreshToken)).resolves.toEqual({
      accessToken: "rotated-access-token",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "rotated-refresh-token",
      refreshExpiresIn: 604800,
    });
  });

  it("throws when the authenticated user cannot be found", async () => {
    authRepository.findUserById.mockResolvedValue(null);

    await expect(authService.getCurrentUser("missing-user")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("clears the stored refresh token on logout", async () => {
    authRepository.updateRefreshToken.mockResolvedValue(persistedUser as never);

    await expect(authService.logout(persistedUser.id)).resolves.toBeUndefined();
    expect(authRepository.updateRefreshToken).toHaveBeenCalledWith({
      userId: persistedUser.id,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  });
});