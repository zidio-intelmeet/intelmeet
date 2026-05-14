import { Router } from "express";
import {
  createTranscript,
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

// POST /api/ai/summarize - Generate summary
router.post("/summarize", generateSummary);

// POST /api/ai/extract-actions - Extract action items
router.post("/extract-actions", extractActionItems);

// POST /api/ai/sentiment - Analyze sentiment
router.post("/sentiment", analyzeSentiment);

// GET /api/ai/summary/:meetingId - Get summary
router.get("/summary/:meetingId", getSummary);

export default router;
