import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";

import type { AuthenticatedUser, AuthTokens, LoginResponse } from "./auth.dto";
import { GoogleLoginDto } from "./auth.dto";
import { RefreshTokenDto } from "./auth.dto";
import { UpdateProfileDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import type { AccessTokenPayload } from "./jwt-auth.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("google/login")
  loginWithGoogle(@Body() body: GoogleLoginDto): Promise<LoginResponse> {
    return this.authService.loginWithGoogle(body.idToken);
  }

  @Post("refresh")
  refresh(@Body() body: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.rotateRefreshToken(body.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.authService.logout(user.sub);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: AccessTokenPayload): Promise<AuthenticatedUser> {
    return this.authService.getCurrentUser(user.sub);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateCurrentUserProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    return this.authService.updateCurrentUserProfile(user.sub, body.name);
  }
}
