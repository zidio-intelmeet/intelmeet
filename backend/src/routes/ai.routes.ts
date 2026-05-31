import { Router } from "express";
import {
  createTranscript,
  getTranscript,
  generateSummary,
  extractActionItems,
  analyzeSentiment,
  getSummary,
} from "../controllers/ai.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply auth and rate limiting
router.use(requireAuth);
router.use(apiRateLimiter);

// POST /api/ai/transcript - Create/upload transcript
router.post("/transcript", createTranscript);
router.post("/transcribe", createTranscript);

// GET /api/ai/transcript/:meetingId - Get transcript for a meeting
// ✅ FIX: api.ts calls GET /api/ai/transcript/:meetingId
router.get("/transcript/:meetingId", getTranscript);

// POST /api/ai/transcript/:meetingId/retry - Retry transcript processing
router.post("/transcript/:meetingId/retry", getTranscript);

// POST /api/ai/summarize - Generate summary
router.post("/summarize", generateSummary);

// POST /api/ai/extract-actions - Extract action items
router.post("/extract-actions", extractActionItems);

// POST /api/ai/sentiment - Analyze sentiment
router.post("/sentiment", analyzeSentiment);

// GET /api/ai/summary/:meetingId - Get summary
router.get("/summary/:meetingId", getSummary);

export default router;
