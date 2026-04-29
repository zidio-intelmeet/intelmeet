import mongoose from "mongoose";
import env from "../configs/env";
import { connectDB, syncApplicationIndexes } from "../configs/db";
import { logger } from "../utils/logger";

const run = async () => {
  await connectDB();
  if (!env.SYNC_INDEXES_ON_BOOT) {
    await syncApplicationIndexes(true);
  }
  await mongoose.disconnect();
  logger.info("MongoDB index sync completed");
};

run().catch(error => {
  logger.error(error, "MongoDB index sync failed");
  process.exit(1);
});
