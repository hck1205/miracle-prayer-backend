import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "crypto";

import {
  AUTH_ENV_KEYS,
  AUTH_TOKEN_DEFAULTS,
  AUTH_TOKEN_TYPES,
} from "./auth.constants";
import type { AuthenticatedUser, AuthTokens, LoginResponse } from "./auth.dto";
import { AuthRepository } from "./auth.repository";
import { GoogleAuthClient } from "./google-auth.client";
import type { AccessTokenPayload } from "./jwt-auth.guard";

interface RefreshTokenPayload {
  sub: string;
  type: typeof AUTH_TOKEN_TYPES.refresh;
  jti: string;
}

@Injectable()
export class AuthService {
  private accessTokenExpiresInSeconds?: number;
  private refreshTokenExpiresInSeconds?: number;
  private refreshTokenSecret?: string;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly googleAuthClient: GoogleAuthClient,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Links a verified Google identity to an application user and issues a fresh token pair.
   */
  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const verifiedGoogleUser = await this.googleAuthClient.verifyIdToken(idToken);
    const user = await this.authRepository.upsertGoogleUser(verifiedGoogleUser);
    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: this.toAuthenticatedUser(user),
    };
  }

  /**
   * Rotates the refresh token by validating the provided token, invalidating the old one,
   * and issuing a fresh access/refresh pair.
   */
  async rotateRefreshToken(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.getRequiredUser(payload.sub);

    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException("Refresh token session does not exist.");
    }

    if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      await this.authRepository.updateRefreshToken({
        userId: user.id,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      });
      throw new UnauthorizedException("Refresh token has expired.");
    }

    if (user.refreshTokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException("Refresh token is invalid.");
    }

    return this.issueTokens(user);
  }

  /**
   * Clears the stored refresh token for the user so the session cannot be refreshed anymore.
   */
  async logout(userId: string): Promise<void> {
    await this.authRepository.updateRefreshToken({
      userId,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  /**
   * Returns the current authenticated user profile.
   */
  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    return this.toAuthenticatedUser(await this.getRequiredUser(userId));
  }

  private createAccessTokenPayload(user: {
    id: string;
    email: string;
  }): AccessTokenPayload {
    return {
      sub: user.id,
      email: user.email,
    };
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    name: string | null;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    name: string | null;
  }): Promise<AuthTokens> {
    const accessTokenExpiresInSeconds = this.getAccessTokenExpiresInSeconds();
    const refreshTokenExpiresInSeconds = this.getRefreshTokenExpiresInSeconds();
    const refreshTokenSecret = this.getRefreshTokenSecret();
    // Token config is process-level configuration, so reading and parsing it
    // once per issuance avoids repeated config churn on hot auth paths.
    const accessToken = await this.jwtService.signAsync(
      this.createAccessTokenPayload(user),
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: AUTH_TOKEN_TYPES.refresh,
        jti: randomUUID(),
      } satisfies RefreshTokenPayload,
      {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresInSeconds,
      },
    );

    await this.authRepository.updateRefreshToken({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      refreshTokenExpiresAt: new Date(
        Date.now() + refreshTokenExpiresInSeconds * 1000,
      ),
    });

    return {
      accessToken,
      tokenType: AUTH_TOKEN_TYPES.bearer,
      expiresIn: accessTokenExpiresInSeconds,
      refreshToken,
      refreshExpiresIn: refreshTokenExpiresInSeconds,
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
      secret: this.getRefreshTokenSecret(),
    });

    if (payload.type !== AUTH_TOKEN_TYPES.refresh) {
      throw new UnauthorizedException("Refresh token is invalid.");
    }

    return payload;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async getRequiredUser(userId: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    refreshTokenHash: string | null;
    refreshTokenExpiresAt: Date | null;
  }> {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    return user;
  }

  private getAccessTokenExpiresInSeconds(): number {
    this.accessTokenExpiresInSeconds ??= this.getPositiveConfigNumber(
      AUTH_ENV_KEYS.accessExpiresIn,
      AUTH_TOKEN_DEFAULTS.accessExpiresInSeconds,
    );
    return this.accessTokenExpiresInSeconds;
  }

  private getRefreshTokenSecret(): string {
    this.refreshTokenSecret ??=
      this.configService.get<string>(AUTH_ENV_KEYS.refreshSecret) ?? "";

    if (!this.refreshTokenSecret) {
      throw new Error(`${AUTH_ENV_KEYS.refreshSecret} must be configured.`);
    }

    return this.refreshTokenSecret;
  }

  private getRefreshTokenExpiresInSeconds(): number {
    this.refreshTokenExpiresInSeconds ??= this.getPositiveConfigNumber(
      AUTH_ENV_KEYS.refreshExpiresIn,
      AUTH_TOKEN_DEFAULTS.refreshExpiresInSeconds,
    );
    return this.refreshTokenExpiresInSeconds;
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
}
