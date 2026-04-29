import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response } from "express";

const handler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later",
    statusCode: 429,
  });
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler,
  keyGenerator: (req) => {
    const email = (req as Request).body?.email ?? "";
    return `${ipKeyGenerator(req as any)}_${email}`;
  },
});

export const googleRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => {
    const expressReq = req as Request;
    return expressReq.user?.id ?? ipKeyGenerator(req as any);
  },
});

export const meetingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => {
    const expressReq = req as Request;
    return expressReq.user?.id ?? ipKeyGenerator(req as any);
  },
});