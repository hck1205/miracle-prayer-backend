import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

import { AUTH_ENV_KEYS } from "./auth.constants";

export interface VerifiedGoogleUser {
  googleSubject: string;
  email: string;
  name: string | null;
}

@Injectable()
export class GoogleAuthClient {
  private readonly oauthClient = new OAuth2Client();
  private allowedClientIds?: string[];

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifies a Google ID token from the client and returns the minimum user profile needed by this service.
   */
  async verifyIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    const clientIds = this.getAllowedClientIds();
    const ticket = await this.oauthClient.verifyIdToken({
      idToken,
      audience: clientIds,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException("Google account verification failed.");
    }

    return {
      googleSubject: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
    };
  }

  private getAllowedClientIds(): string[] {
    if (this.allowedClientIds != null) {
      return this.allowedClientIds;
    }

    const rawClientIds = this.configService.get<string>(AUTH_ENV_KEYS.googleClientIds);
    const clientIds = rawClientIds
      ?.split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (!clientIds || clientIds.length === 0) {
      throw new Error(`${AUTH_ENV_KEYS.googleClientIds} must be configured.`);
    }

    // OAuth audiences are static configuration for the lifetime of the
    // process, so we parse them once and reuse the result for each login.
    this.allowedClientIds = clientIds;
    return this.allowedClientIds;
  }
}
