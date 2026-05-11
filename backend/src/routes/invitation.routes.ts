/**
 * Invitation Routes
 */

import { Router } from "express";
import { acceptInvitation, validateInvitation } from "../controllers/invitation.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// POST - Accept invitation
router.post(
  "/accept",
  requireAuth,
  apiRateLimiter,
  acceptInvitation
);

// GET - Validate invitation token
router.get(
  "/validate",
  apiRateLimiter,
  validateInvitation
);

export default router;
