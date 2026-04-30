import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  googleLogin,
  googleCallback,
  getMe,
  updateProfile // <-- 1. Import the new controller
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { authRateLimiter, googleRateLimiter, apiRateLimiter } from "../middlewares/rate-limiter"; // <-- 2. Import apiRateLimiter
import { uploadAvatar } from "../middlewares/upload.middleware"; // <-- 3. Import the multer upload middleware

const router = Router();

// Tenant context is now applied globally in app.ts
router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/google", googleRateLimiter, googleLogin);
router.get("/google/callback", googleCallback);
router.get("/me", requireAuth, getMe);

// --- NEW PROFILE ROUTE ---
router.put(
  "/profile",
  requireAuth,                  // Step 1: Ensure the user is logged in
  apiRateLimiter,               // Step 2: Prevent spam attacks on the upload endpoint
  uploadAvatar.single("avatar"), // Step 3: Intercept and upload the image to Cloudinary
  updateProfile                 // Step 4: Save the URL and text data to MongoDB
);

export default router;