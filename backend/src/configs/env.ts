import dotenvFlow from "dotenv-flow";
import { z } from "zod";

dotenvFlow.config({ silent: true });

// ─── Schema ───────────────────────────────────────────────────────────────────
// Uses .optional().transform() instead of z.preprocess() which is unreliable
// in Zod v4 when the inner schema must receive a non-undefined value.

export const envSchema = z.object({
  // ── Node ──────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .transform((v) => v ?? "development"),

  PORT: z.string().transform(Number),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── CORS ──────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((v) => {
      const val = v?.trim();
      if (!val) return "https://intelmeet-alpha.vercel.app";
      try {
        new URL(val);
        return val;
      } catch {
        return "https://intelmeet-alpha.vercel.app";
      }
    }),

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional()
    .transform((v) => v ?? "info"),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().optional().transform((v) => v ?? "15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().transform((v) => v ?? "7d"),

  // ── Tenant ────────────────────────────────────────────────────────────────
  DEFAULT_TENANT_ID: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toLowerCase() || "public" : "public")),

  SYNC_INDEXES_ON_BOOT: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v !== undefined ? v === "true" : undefined)),

  // ── Google OAuth ──────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z
    .string()
    .optional()
    .transform((v) => {
      const val = v?.trim();
      if (!val) {
        return "https://intelmeet-ff4w.onrender.com/api/auth/google/callback";
      }
      try {
        new URL(val);
        return val;
      } catch {
        return "https://intelmeet-ff4w.onrender.com/api/auth/google/callback";
      }
    }),

  // ── Cloudinary ────────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // ── Optional services ─────────────────────────────────────────────────────
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Env = z.infer<typeof envSchema>;

// ─── Parse & validate ─────────────────────────────────────────────────────────

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment configuration");
  console.error(result.error.format());
  process.exit(1);
}

export const env: Readonly<Env> = Object.freeze({
  ...result.data,
  SYNC_INDEXES_ON_BOOT:
    result.data.SYNC_INDEXES_ON_BOOT ??
    result.data.NODE_ENV !== "production",
});

export default env;