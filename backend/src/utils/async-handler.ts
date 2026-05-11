import { Request, Response, NextFunction } from "express";

export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function AsyncHandler(fn: AsyncRouteHandler) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
}

// Export with lowercase name as well for compatibility
export const asyncHandler = AsyncHandler;
