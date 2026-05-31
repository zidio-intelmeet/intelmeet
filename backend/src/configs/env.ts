import dotenvFlow from "dotenv-flow";
import { z } from "zod";

dotenvFlow.config({ silent: true });

// ─── Preprocessor Helpers ────────────────────────────────────────────────────

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

/**
 * In Zod v4, .default() and .catch() do NOT reliably intercept `undefined`
 * after z.preprocess() — the inner schema validates first and throws.
 * The only reliable pattern is to bake the fallback INTO the preprocessor.
 */
const withDefault = (fallback: string) => (value: unknown): string => {
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
  /** Defaults to "development" if not set */
  NODE_ENV: z.preprocess(
    withDefault("development"),
    z.enum(["development", "test", "production"])
  ),

  PORT: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().regex(/^\d+$/, "PORT must be a number").transform(Number)
  ),

  DATABASE_URL: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().url()
  ),

  /** Defaults to Vercel production URL — override via CORS_ORIGIN on Render */
  CORS_ORIGIN: z.preprocess(
    withDefault("https://intelmeet-alpha.vercel.app"),
    z.string().url()
  ),

  /** Defaults to "info" if not set */
  LOG_LEVEL: z.preprocess(
    withDefault("info"),
    z.enum(["fatal", "error", "warn", "info", "debug", "trace"])
  ),

  JWT_ACCESS_SECRET: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(32)
  ),
  JWT_REFRESH_SECRET: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(32)
  ),

  /** Defaults to "15m" if not set */
  JWT_ACCESS_EXPIRES_IN: z.preprocess(withDefault("15m"), durationSchema),

  /** Defaults to "7d" if not set */
  JWT_REFRESH_EXPIRES_IN: z.preprocess(withDefault("7d"), durationSchema),

  /** Defaults to "public" if not set */
  DEFAULT_TENANT_ID: z.preprocess(
    withDefault("public"),
    z.string().trim().min(1)
  ),

  SYNC_INDEXES_ON_BOOT: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value ? value === "true" : undefined)),

  GOOGLE_CLIENT_ID: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1)
  ),
  GOOGLE_CLIENT_SECRET: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1)
  ),

  /** Defaults to the Render production callback URL */
  GOOGLE_CALLBACK_URL: z.preprocess(
    withDefault("https://intelmeet-ff4w.onrender.com/api/auth/google/callback"),
    z.string().url()
  ),

  CLOUDINARY_CLOUD_NAME: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1)
  ),
  CLOUDINARY_API_KEY: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1)
  ),
  CLOUDINARY_API_SECRET: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1)
  ),

  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

// ─── Types & Export ───────────────────────────────────────────────────────────

export type Env = z.infer<typeof envSchema>;

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