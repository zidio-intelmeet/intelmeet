import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import env from "../configs/env";

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
}

type RawJwtPayload = {
  userId?: unknown;
  email?: unknown;
  tenantId?: unknown;
};

const normalizePayload = (payload: RawJwtPayload): JwtPayload => {
  if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }

  return {
    userId: payload.userId,
    email: payload.email,
    tenantId:
      typeof payload.tenantId === "string" && payload.tenantId.trim() !== ""
        ? payload.tenantId
        : env.DEFAULT_TENANT_ID,
  };
};

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
  });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return normalizePayload(jwt.verify(token, env.JWT_ACCESS_SECRET) as RawJwtPayload);
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return normalizePayload(
    jwt.verify(token, env.JWT_REFRESH_SECRET) as RawJwtPayload
  );
};

export const generateTokenPair = (payload: JwtPayload) => ({
  accessToken: generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
});
