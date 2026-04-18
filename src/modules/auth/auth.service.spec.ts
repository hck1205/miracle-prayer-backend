import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import { createHash } from "crypto";

import type { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import type { VerifiedGoogleUser, GoogleAuthClient } from "./google-auth.client";

type AuthRepositoryMock = Pick<
  AuthRepository,
  "upsertGoogleUser" | "findUserById" | "updateRefreshToken" | "updateUserProfile"
>;

type GoogleAuthClientMock = Pick<GoogleAuthClient, "verifyIdToken">;

type JwtServiceMock = Pick<JwtService, "signAsync" | "verifyAsync">;

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

  let authRepository: AuthRepositoryMock;
  let googleAuthClient: GoogleAuthClientMock;
  let jwtService: JwtServiceMock;
  let upsertGoogleUserMock: jest.MockedFunction<AuthRepository["upsertGoogleUser"]>;
  let findUserByIdMock: jest.MockedFunction<AuthRepository["findUserById"]>;
  let updateRefreshTokenMock: jest.MockedFunction<AuthRepository["updateRefreshToken"]>;
  let updateUserProfileMock: jest.MockedFunction<AuthRepository["updateUserProfile"]>;
  let verifyIdTokenMock: jest.MockedFunction<GoogleAuthClient["verifyIdToken"]>;
  let signAsyncMock: jest.MockedFunction<JwtService["signAsync"]>;
  let verifyAsyncMock: jest.MockedFunction<JwtService["verifyAsync"]>;
  let authService: AuthService;

  beforeEach(() => {
    upsertGoogleUserMock = jest.fn() as jest.MockedFunction<
      AuthRepository["upsertGoogleUser"]
    >;
    findUserByIdMock = jest.fn() as jest.MockedFunction<AuthRepository["findUserById"]>;
    updateRefreshTokenMock = jest.fn() as jest.MockedFunction<
      AuthRepository["updateRefreshToken"]
    >;
    updateUserProfileMock = jest.fn() as jest.MockedFunction<
      AuthRepository["updateUserProfile"]
    >;

    authRepository = {
      upsertGoogleUser: upsertGoogleUserMock,
      findUserById: findUserByIdMock,
      updateRefreshToken: updateRefreshTokenMock,
      updateUserProfile: updateUserProfileMock,
    };

    verifyIdTokenMock = jest.fn() as jest.MockedFunction<
      GoogleAuthClient["verifyIdToken"]
    >;
    googleAuthClient = {
      verifyIdToken: verifyIdTokenMock,
    };

    signAsyncMock = jest.fn() as jest.MockedFunction<JwtService["signAsync"]>;
    verifyAsyncMock = jest.fn() as jest.MockedFunction<JwtService["verifyAsync"]>;
    jwtService = {
      signAsync: signAsyncMock,
      verifyAsync: verifyAsyncMock,
    };

    authService = new AuthService(
      authRepository as unknown as AuthRepository,
      googleAuthClient as unknown as GoogleAuthClient,
      jwtService as unknown as JwtService,
      new ConfigService({
        JWT_ACCESS_EXPIRES_IN: "900",
        JWT_REFRESH_SECRET: "refresh-secret",
        JWT_REFRESH_EXPIRES_IN: String(60 * 60 * 24 * 7),
      }),
    );
  });

  it("returns a token pair and user profile after Google login", async () => {
    verifyIdTokenMock.mockResolvedValue(verifiedGoogleUser);
    upsertGoogleUserMock.mockResolvedValue(persistedUser as never);
    updateRefreshTokenMock.mockResolvedValue(persistedUser as never);
    signAsyncMock
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

    verifyAsyncMock.mockResolvedValue({
      sub: persistedUser.id,
      type: "refresh",
      jti: "token-1",
    } as never);
    findUserByIdMock.mockResolvedValue(storedUser as never);
    updateRefreshTokenMock.mockResolvedValue(storedUser as never);
    signAsyncMock
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
    findUserByIdMock.mockResolvedValue(null);

    await expect(authService.getCurrentUser("missing-user")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("clears the stored refresh token on logout", async () => {
    updateRefreshTokenMock.mockResolvedValue(persistedUser as never);

    await expect(authService.logout(persistedUser.id)).resolves.toBeUndefined();
    expect(updateRefreshTokenMock).toHaveBeenCalledWith({
      userId: persistedUser.id,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  });

  it("updates the authenticated user's profile name", async () => {
    updateUserProfileMock.mockResolvedValue({
      ...persistedUser,
      name: "Quiet Candle",
    } as never);

    await expect(
      authService.updateCurrentUserProfile(persistedUser.id, "  Quiet Candle  "),
    ).resolves.toEqual({
      id: persistedUser.id,
      email: persistedUser.email,
      name: "Quiet Candle",
    });

    expect(updateUserProfileMock).toHaveBeenCalledWith({
      userId: persistedUser.id,
      name: "Quiet Candle",
    });
  });
});
