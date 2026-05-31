import { Request, Response } from "express";
import crypto from "crypto";
import { AsyncHandler } from "../utils/async-handler";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import User from "../models/user.model";
import { hashPassword } from "../utils/hash";
import EmailService from "../services/email.service";
import env from "../configs/env";

export const forgotPassword = AsyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest("Email is required");

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  
  // Always return success to prevent email enumeration
  if (!user) {
    return ApiResponse.ok(res, "If an account exists with that email, a reset link has been sent.");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Store hashed token with expiry
  (user as any).resetPasswordToken = resetTokenHash;
  (user as any).resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  const frontendUrl = env.CORS_ORIGIN || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  // Send via email service (uses Resend)
  try {
    await EmailService.sendPasswordResetEmail(user.email, user.name, resetLink);
  } catch (emailErr) {
    // Log but don't expose error to client
    console.error("[PASSWORD RESET] Email send failed:", emailErr);
  }

  return ApiResponse.ok(res, "If an account exists with that email, a reset link has been sent.");
});

export const resetPassword = AsyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) throw ApiError.badRequest("Token and new password are required");
  if (password.length < 8) throw ApiError.badRequest("Password must be at least 8 characters");

  // Hash the incoming token to compare against stored hash
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) throw ApiError.badRequest("Invalid or expired password reset token");

  // ✅ FIX: Hash the password before saving (was stored as plaintext before)
  user.password = await hashPassword(password);
  (user as any).resetPasswordToken = undefined;
  (user as any).resetPasswordExpires = undefined;
  await user.save();

  return ApiResponse.ok(res, "Password has been successfully reset. You can now log in.");
});