export const FEED_ENV_KEYS = {
  urgentCooldownSeconds: "FEED_URGENT_COOLDOWN_SECONDS",
} as const;

export const FEED_DEFAULTS = {
  urgentCooldownSeconds: 7 * 24 * 60 * 60,
} as const;
