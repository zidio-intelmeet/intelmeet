import { Router } from "express";
import {
  getOrganizations,
  getMyOrganization,
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

// GET /api/organizations/me - Get current user's organization
// ✅ FIX: Must be registered BEFORE /:slug to avoid "me" being treated as a slug
router.get("/me", getMyOrganization);

// GET /api/organizations/:slug - Get organization by slug
router.get("/:slug", getOrganizationBySlug);

// POST /api/organizations - Create organization
router.post("/", createOrganization);

// PUT /api/organizations/:orgId - Update organization
router.put("/:orgId", updateOrganization);

// GET /api/organizations/:orgId/members - Get all members
// Returns the full organization with populated members
router.get("/:orgId/members", async (req, res, next) => {
  try {
    const { getOrganizations } = await import("../controllers/organization.controller");
    // Reuse getOrganizations but the org members are embedded
    const org = await (await import("../models/organization.model")).default
      .findById(req.params.orgId)
      .populate("owner", "name avatar email")
      .populate("members.userId", "name avatar email");
    if (!org) return res.status(404).json({ statusCode: 404, message: "Organization not found" });
    return res.status(200).json({ statusCode: 200, data: org.members, message: "Members retrieved" });
  } catch (err) { next(err); }
});

// POST /api/organizations/:orgId/members - Add member (sends invitation)
router.post("/:orgId/members", addMember);

// DELETE /api/organizations/:orgId/members/:memberId - Remove member
router.delete("/:orgId/members/:memberId", removeMember);

// DELETE /api/organizations/:orgId - Delete organization
router.delete("/:orgId", deleteOrganization);

export default router;
