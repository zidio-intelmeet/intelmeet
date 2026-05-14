import { Router } from "express";
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  getMeetingByCode,
  updateMeeting,
  deleteMeeting,
  startMeeting,
  endMeeting,
  joinMeeting,
} from "../controllers/meeting.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply authentication to all meeting routes
router.use(requireAuth);
router.use(apiRateLimiter);

// ─── CRUD ────────────────────────────────────────────────────
// GET  /api/meetings          — List all meetings for tenant
router.get("/", getMeetings);

// POST /api/meetings          — Create a new meeting (Admin only)
router.post("/", createMeeting);

// GET  /api/meetings/code/:code — Get meeting by join code
router.get("/code/:code", getMeetingByCode);

// GET  /api/meetings/:id      — Get meeting by MongoDB _id
router.get("/:id", getMeetingById);

// PUT  /api/meetings/:id      — Update meeting details
router.put("/:id", updateMeeting);

// DELETE /api/meetings/:id    — Delete meeting
router.delete("/:id", deleteMeeting);

// ─── LIFECYCLE ───────────────────────────────────────────────
// POST /api/meetings/:id/start — Start a scheduled meeting
router.post("/:id/start", startMeeting);

// POST /api/meetings/:id/end   — End an ongoing meeting
router.post("/:id/end", endMeeting);

// POST /api/meetings/:id/join  — Join as participant
router.post("/:id/join", joinMeeting);

export default router;