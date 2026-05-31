import { Router } from "express";
import {
  getTranscripts,
  getTranscriptById,
  createTranscript,
  deleteTranscript,
} from "../controllers/transcript.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply auth and rate limiting to all routes
router.use(requireAuth);
router.use(apiRateLimiter);

// ✅ FIX: /single/:transcriptId MUST come BEFORE /:meetingId 
// to prevent "single" from being matched as a meetingId
// GET /api/transcripts/single/:transcriptId - Get single transcript
router.get("/single/:transcriptId", getTranscriptById);

// GET /api/transcripts/:meetingId - Get all transcripts for a meeting
router.get("/:meetingId", getTranscripts);

// POST /api/transcripts - Create transcript
router.post("/", createTranscript);

// DELETE /api/transcripts/:transcriptId - Delete transcript
router.delete("/:transcriptId", deleteTranscript);

export default router;
