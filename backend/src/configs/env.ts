import dotenvFlow from "dotenv-flow";
import { z } from "zod";

dotenvFlow.config({ silent: true });

// ─── Preprocessor Helpers ────────────────────────────────────────────────────

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

/** Converts empty/whitespace strings to undefined so .default() can kick in */
const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

/**
 * For URL fields: returns the fallback URL when the env var is missing/empty.
 * This is needed because z.string().url() fails on `undefined` BEFORE
 * .default() gets a chance to apply in Zod v4 preprocess chains.
 */
const withUrlDefault = (fallback: string) => (value: unknown) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? fallback : trimmed;
  }
  return fallback;
};

const durationSchema = z.string().regex(
  /^\d+$|^\d+\s*(ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years)$/i,
  'JWT expiry must be a number of seconds or a valid duration like "15m" or "7d"'
);

// ─── Environment Schema ───────────────────────────────────────────────────────

export const envSchema = z.object({
  NODE_ENV: z
    .preprocess(emptyStringToUndefined, z.enum(["development", "test", "production"]))
    .catch("development"),

  PORT: z.preprocess(
    trimString,
    z.string().regex(/^\d+$/, "PORT must be a number").transform(Number)
  ),

  DATABASE_URL: z.preprocess(trimString, z.string().url()),

  /** Defaults to the Vercel frontend URL — override via CORS_ORIGIN env var on Render */
  CORS_ORIGIN: z.preprocess(
    withUrlDefault("https://intelmeet-alpha.vercel.app"),
    z.string().url()
  ),

  LOG_LEVEL: z
    .preprocess(emptyStringToUndefined, z.enum(["fatal", "error", "warn", "info", "debug", "trace"]))
    .catch("info"),

  JWT_ACCESS_SECRET: z.preprocess(trimString, z.string().min(32)),
  JWT_REFRESH_SECRET: z.preprocess(trimString, z.string().min(32)),

  JWT_ACCESS_EXPIRES_IN: z
    .preprocess(emptyStringToUndefined, durationSchema)
    .catch("15m"),

  JWT_REFRESH_EXPIRES_IN: z
    .preprocess(emptyStringToUndefined, durationSchema)
    .catch("7d"),

  DEFAULT_TENANT_ID: z
    .preprocess(emptyStringToUndefined, z.string().trim().min(1))
    .catch("public"),

  SYNC_INDEXES_ON_BOOT: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value ? value === "true" : undefined)),

  GOOGLE_CLIENT_ID: z.preprocess(trimString, z.string().min(1)),
  GOOGLE_CLIENT_SECRET: z.preprocess(trimString, z.string().min(1)),

  /** Defaults to the Render backend callback URL */
  GOOGLE_CALLBACK_URL: z.preprocess(
    withUrlDefault("https://intelmeet-ff4w.onrender.com/api/auth/google/callback"),
    z.string().url()
  ),

  CLOUDINARY_CLOUD_NAME: z.preprocess(trimString, z.string().min(1)),
  CLOUDINARY_API_KEY: z.preprocess(trimString, z.string().min(1)),
  CLOUDINARY_API_SECRET: z.preprocess(trimString, z.string().min(1)),

  REDIS_URL: z.preprocess(emptyStringToUndefined, z.string()).optional(),
  OPENAI_API_KEY: z.preprocess(emptyStringToUndefined, z.string()).optional(),
  RESEND_API_KEY: z.preprocess(emptyStringToUndefined, z.string()).optional(),
  EMAIL_FROM: z.preprocess(emptyStringToUndefined, z.string()).optional(),
});

// ─── Export ───────────────────────────────────────────────────────────────────

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = ParsedEnv & {
  REDIS_URL?: string;
  OPENAI_API_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment configuration");
  console.error(result.error.format());
  process.exit(1);
}

export const env: Readonly<Env> = Object.freeze({
  ...result.data,
  DEFAULT_TENANT_ID: result.data.DEFAULT_TENANT_ID.toLowerCase(),
  SYNC_INDEXES_ON_BOOT:
    result.data.SYNC_INDEXES_ON_BOOT ?? result.data.NODE_ENV !== "production",
});

export default env;