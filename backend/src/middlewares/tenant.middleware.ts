import { Request, Response, NextFunction } from "express";
import env from "../configs/env";
import { ApiError } from "../utils/api-error";

const TENANT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-_]{1,62})$/;

const readTenantCandidate = (req: Request): unknown =>
  req.headers["x-tenant-id"] ??
  req.headers["x-tenant-slug"] ??
  req.body?.tenantId ??
  req.body?.tenantSlug ??
  req.query.tenantId ??
  req.query.tenantSlug;

export const normalizeTenantId = (value: unknown): string => {
  if (typeof value !== "string") {
    throw ApiError.badRequest("Tenant ID must be a string");
  }

  const normalized = value.trim().toLowerCase();

  if (!TENANT_ID_PATTERN.test(normalized)) {
    throw ApiError.badRequest(
      "Tenant ID must be 2-63 characters and use only lowercase letters, numbers, hyphens, or underscores"
    );
  }

  return normalized;
};

export const resolveTenantId = (req: Request): string => {
  const candidate = readTenantCandidate(req);

  if (candidate === undefined || candidate === null || candidate === "") {
    return env.DEFAULT_TENANT_ID;
  }

  return normalizeTenantId(candidate);
};

export const attachTenantContext = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.tenantId = resolveTenantId(req);
  next();
};
