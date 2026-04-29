import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";
import { AsyncHandler } from "../utils/async-handler";
import User from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        email: string;
        name: string;
        avatar: string | null;
      };
      tenantId?: string;
      orgId?: string;
    }
  }
}

export const requireAuth = AsyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Access token missing");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    if (req.tenantId && req.tenantId !== payload.tenantId) {
      throw ApiError.forbidden("Token does not grant access to this tenant");
    }

    const user = await User.findOne({
      _id: payload.userId,
      tenantId: payload.tenantId,
    });
    if (!user) throw ApiError.unauthorized("User no longer exists");

    req.tenantId = user.tenantId;
    req.user = {
      id: user._id.toString(),
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    };

    next();
  }
);
