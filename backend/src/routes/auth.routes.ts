import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  googleLogin,
  googleCallback,
  getMe,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { authRateLimiter, googleRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Tenant context is now applied globally in app.ts
router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/google", googleRateLimiter, googleLogin);
router.get("/google/callback", googleCallback);
router.get("/me", requireAuth, getMe);

export default router;
