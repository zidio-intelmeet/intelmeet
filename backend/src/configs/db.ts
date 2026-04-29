import mongoose from "mongoose";
import env from "./env";

import { logger } from "../utils/logger";
import { syncUserIndexes } from "../models/user.model";

if (!env.DATABASE_URL) {
  throw new Error("Please provide DATABASE_URL in the environment variables");
}

export const syncApplicationIndexes = async (force = false) => {
  if (!force && !env.SYNC_INDEXES_ON_BOOT) {
    return;
  }

  const syncedIndexes = await syncUserIndexes();
  logger.info(
    { syncedIndexes },
    "MongoDB indexes synchronized for tenant-aware auth"
  );
};

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.DATABASE_URL as string);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    await syncApplicationIndexes();
  } catch (error) {
    logger.error(error, "MongoDB Connection Failed:");
    process.exit(1);
  }
};
