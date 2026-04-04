export const AUTH_ENV_KEYS = {
  accessExpiresIn: "JWT_ACCESS_EXPIRES_IN",
  accessSecret: "JWT_ACCESS_SECRET",
  frontendOrigins: "FRONTEND_ORIGINS",
  googleClientIds: "GOOGLE_CLIENT_IDS",
  refreshExpiresIn: "JWT_REFRESH_EXPIRES_IN",
  refreshSecret: "JWT_REFRESH_SECRET",
} as const;

export const AUTH_TOKEN_DEFAULTS = {
  accessExpiresInSeconds: "900",
  refreshExpiresInSeconds: String(60 * 60 * 24 * 7),
} as const;

export const AUTH_TOKEN_TYPES = {
  bearer: "Bearer",
  refresh: "refresh",
} as const;