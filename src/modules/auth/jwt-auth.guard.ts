import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenExpiredError } from "jsonwebtoken";

import { AUTH_ENV_KEYS, AUTH_TOKEN_TYPES } from "./auth.constants";

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private accessTokenSecret?: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates the bearer token from the Authorization header and stores the payload on request.user.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: AccessTokenPayload;
    }>();
    const authorizationHeader = request.headers?.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException("Authorization header is required.");
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== AUTH_TOKEN_TYPES.bearer || !token) {
      throw new UnauthorizedException(`${AUTH_TOKEN_TYPES.bearer} token is required.`);
    }

    try {
      request.user = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.getAccessTokenSecret(),
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException("Access token has expired.");
      }

      throw new UnauthorizedException("Access token is invalid.");
    }

    return true;
  }

  private getAccessTokenSecret(): string {
    this.accessTokenSecret ??=
      this.configService.get<string>(AUTH_ENV_KEYS.accessSecret) ?? "";

    if (!this.accessTokenSecret) {
      throw new Error(`${AUTH_ENV_KEYS.accessSecret} must be configured.`);
    }

    return this.accessTokenSecret;
  }
}
