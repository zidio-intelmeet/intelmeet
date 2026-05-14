import dotenvFlow from "dotenv-flow";
import { z } from "zod";

dotenvFlow.config();

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const durationSchema = z.string().regex(
  /^\d+$|^\d+\s*(ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years)$/i,
  'JWT expiry must be a number of seconds or a valid duration like "15m" or "7d"'
);

export const envSchema = z.object({
  NODE_ENV: z.preprocess(
    emptyStringToUndefined,
    z.enum(["development", "test", "production"]).default("development")
  ),

  PORT: z.preprocess(
    trimString,
    z.string().regex(/^\d+$/, "PORT must be a number").transform(Number)
  ),

  DATABASE_URL: z.preprocess(trimString, z.string().url()),

  CORS_ORIGIN: z.preprocess(trimString, z.string().url()),

  LOG_LEVEL: z.preprocess(
    emptyStringToUndefined,
    z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")
  ),
  JWT_ACCESS_SECRET: z.preprocess(trimString, z.string().min(32)),
  JWT_REFRESH_SECRET: z.preprocess(trimString, z.string().min(32)),
  JWT_ACCESS_EXPIRES_IN: z.preprocess(
    emptyStringToUndefined,
    durationSchema.default("15m")
  ),
  JWT_REFRESH_EXPIRES_IN: z.preprocess(
    emptyStringToUndefined,
    durationSchema.default("7d")
  ),
  DEFAULT_TENANT_ID: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).default("public")
  ),
  SYNC_INDEXES_ON_BOOT: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value ? value === "true" : undefined)),

  GOOGLE_CLIENT_ID: z.preprocess(trimString, z.string().min(1)),
  GOOGLE_CLIENT_SECRET: z.preprocess(trimString, z.string().min(1)),
  GOOGLE_CALLBACK_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url().optional()
  ),

  CLOUDINARY_CLOUD_NAME: z.preprocess(trimString, z.string().min(1)),
  CLOUDINARY_API_KEY: z.preprocess(trimString, z.string().min(1)),
  CLOUDINARY_API_SECRET: z.preprocess(trimString, z.string().min(1)),

  REDIS_URL: z
    .preprocess(emptyStringToUndefined, z.string())
    .optional(),

  OPENAI_API_KEY: z
    .preprocess(emptyStringToUndefined, z.string())
    .optional(),

  RESEND_API_KEY: z
    .preprocess(emptyStringToUndefined, z.string())
    .optional(),

  EMAIL_FROM: z
    .preprocess(emptyStringToUndefined, z.string())
    .optional(),
});

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = Omit<ParsedEnv, "GOOGLE_CALLBACK_URL"> & {
  GOOGLE_CALLBACK_URL: string;
  REDIS_URL?: string;
  OPENAI_API_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment configuration");
  console.error(result.error.format()); // Note: z.prettifyError is not a standard zod method in the current version, swapped to format() to be safe.
  process.exit(1);
}

export const env: Readonly<Env> = Object.freeze({
  ...result.data,
  DEFAULT_TENANT_ID: result.data.DEFAULT_TENANT_ID.toLowerCase(),
  SYNC_INDEXES_ON_BOOT:
    result.data.SYNC_INDEXES_ON_BOOT ?? result.data.NODE_ENV !== "production",
  GOOGLE_CALLBACK_URL:
    result.data.GOOGLE_CALLBACK_URL ??
    `http://localhost:${result.data.PORT}/api/auth/google/callback`,
});

export default env;