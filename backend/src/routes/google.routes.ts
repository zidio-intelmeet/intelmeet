import { Router } from "express";
import { initGoogleAuth, googleAuthCallback } from "../controllers/google.controller";

const router = Router();

router.get("/google", initGoogleAuth);
router.get("/google/callback", googleAuthCallback);

export default router;