import { Router } from "express";
import {
  getOrganizations,
  getOrganizationBySlug,
  createOrganization,
  updateOrganization,
  addMember,
  removeMember,
  deleteOrganization,
} from "../controllers/organization.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply auth and rate limiting
router.use(requireAuth);
router.use(apiRateLimiter);

// GET /api/organizations - Get all organizations for user
router.get("/", getOrganizations);

// GET /api/organizations/:slug - Get organization by slug (public)
router.get("/:slug", getOrganizationBySlug);

// POST /api/organizations - Create organization
router.post("/", createOrganization);

// PUT /api/organizations/:orgId - Update organization
router.put("/:orgId", updateOrganization);

// POST /api/organizations/:orgId/members - Add member
router.post("/:orgId/members", addMember);

// DELETE /api/organizations/:orgId/members/:memberId - Remove member
router.delete("/:orgId/members/:memberId", removeMember);

// DELETE /api/organizations/:orgId - Delete organization
router.delete("/:orgId", deleteOrganization);

export default router;
