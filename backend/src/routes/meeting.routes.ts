import { Router } from "express";
import { createMeeting, getMeetingById } from "../controllers/meeting.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply authentication to all meeting routes
router.use(requireAuth);
router.use(apiRateLimiter);

// Route: POST /api/meetings
router.post("/", createMeeting);

// Route: GET /api/meetings/:meetingId
router.get("/:meetingId", getMeetingById);

export default router;