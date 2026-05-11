import { createClient } from "redis";
import env from "./env";

let redis: any = null;

export const initRedis = async () => {
  if (redis) return redis;

  try {
    redis = createClient({
      url: env.REDIS_URL || "redis://localhost:6379",
    });

    redis.on("error", (err: any) => console.error("Redis Client Error", err));
    redis.on("connect", () => console.log("✅ Redis connected"));

    await redis.connect();
    return redis;
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
    // Don't throw - app can work without Redis (but caching will be disabled)
    return null;
  }
};

export const getRedis = () => redis;

// Helper functions
export const setCache = async (key: string, value: any, expirySeconds: number = 3600) => {
  if (!redis) return;
  try {
    await redis.setEx(key, expirySeconds, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error);
  }
};

export const getCache = async (key: string) => {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
};

export const deleteCache = async (key: string) => {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
};

export const flushCache = async (pattern: string = "*") => {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error("Cache flush error:", error);
  }
};
