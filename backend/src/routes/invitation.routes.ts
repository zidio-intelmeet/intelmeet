/**
 * Invitation Routes
 */

import { Router } from "express";
import { acceptInvitation, validateInvitation, getPendingInvitations } from "../controllers/invitation.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// 🚀 FIX: Added the missing /pending route
// GET - Get pending invitations for an email
router.get(
  "/pending",
  requireAuth,
  apiRateLimiter,
  getPendingInvitations
);

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