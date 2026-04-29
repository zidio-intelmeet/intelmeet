import { Request, Response, NextFunction } from "express";
import env from "../configs/env";

import { ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";

const formatDuplicateKeyMessage = (keyValue?: Record<string, unknown>) => {
  if (!keyValue) {
    return "A record with the same unique value already exists";
  }

  const keys = Object.keys(keyValue);
  if (keys.length === 0) {
    return "A record with the same unique value already exists";
  }

  return `${keys.join(", ")} already exists for this tenant`;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }
  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown;
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    statusCode = 409;
    message = formatDuplicateKeyMessage(
      (err as { keyValue?: Record<string, unknown> }).keyValue
    );
  }

  logger.error(
    err,
    `Error: ${message} | Status: ${statusCode} | Path: ${req.method} ${req.originalUrl}`
  );

  const response = {
    success: false,
    message,
    statusCode,
    ...(errors !== undefined && { errors }),
    ...(env.NODE_ENV === "development" && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};
