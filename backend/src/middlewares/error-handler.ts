import { Request, Response, NextFunction } from "express";
import env from "../configs/env";
import { ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";

const formatDuplicateKeyMessage = (keyValue?: Record<string, unknown>) => {
  if (!keyValue) return "A record with the same unique value already exists";
  const keys = Object.keys(keyValue);
  if (keys.length === 0) return "A record with the same unique value already exists";
  return `${keys.join(", ")} already exists for this tenant`;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) return next(err);

  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
    statusCode = 409;
    message = formatDuplicateKeyMessage((err as any).keyValue);
  }

  // 🚀 FIX: Ignore the completely normal "No refresh token" checks so it doesn't spam your terminal
  const isSilentError = statusCode === 401 && req.originalUrl.includes("/auth/refresh");

  if (!isSilentError) {
    logger.error(
      err,
      `Error: ${message} | Status: ${statusCode} | Path: ${req.method} ${req.originalUrl}`
    );
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(errors !== undefined && { errors }),
    ...(env.NODE_ENV === "development" && { stack: err.stack })
  });
};