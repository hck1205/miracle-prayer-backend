import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../../prisma/prisma.module";
import { AUTH_ENV_KEYS, AUTH_TOKEN_DEFAULTS } from "./auth.constants";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { GoogleAuthClient } from "./google-auth.client";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(AUTH_ENV_KEYS.accessSecret);
        const expiresIn = Number(
          configService.get<string>(AUTH_ENV_KEYS.accessExpiresIn) ??
            AUTH_TOKEN_DEFAULTS.accessExpiresInSeconds,
        );

        if (!secret) {
          throw new Error(`${AUTH_ENV_KEYS.accessSecret} must be configured.`);
        }

        if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
          throw new Error(
            `${AUTH_ENV_KEYS.accessExpiresIn} must be a positive number in seconds.`,
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleAuthClient, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
