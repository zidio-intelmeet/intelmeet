import { Request, Response } from "express";
import { z } from "zod";
import * as AuthService from "../services/auth.service";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { verifyRefreshToken, generateTokenPair } from "../utils/jwt";
import { AsyncHandler } from "../utils/async-handler";
import env from "../configs/env";
import { normalizeTenantId } from "../middlewares/tenant.middleware";
import User from "../models/user.model";
import EmailService from "../services/email.service";
import { logger } from "../utils/logger";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["Admin", "Member"]).optional(), 
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const encodeOAuthState = (tenantId: string) => 
  Buffer.from(JSON.stringify({ tenantId }), "utf8").toString("base64url");

const decodeOAuthState = (state: unknown): string => {
  if (typeof state !== "string" || state.trim() === "") return env.DEFAULT_TENANT_ID;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { tenantId?: unknown };
    return normalizeTenantId(parsed.tenantId ?? env.DEFAULT_TENANT_ID);
  } catch { 
    return env.DEFAULT_TENANT_ID; 
  }
};

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "strict" | "lax" | "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const getClearCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "strict" | "lax" | "none",
    path: "/",
  };
};

const setTokenCookies = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, getCookieOptions());
};

export const register = AsyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.issues);
  
  const { name, email, password, role } = parsed.data;
  const { user, tokens } = await AuthService.registerUser(req.tenantId ?? env.DEFAULT_TENANT_ID, name, email, password, role);
  
  setTokenCookies(res, tokens.refreshToken);
  EmailService.sendWelcomeEmail(user.email, user.name).catch((err) => 
    logger.error("Welcome email failed", err)
  );

  return ApiResponse.created(res, "Registration successful", { user, accessToken: tokens.accessToken });
});

export const login = AsyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.issues);
  
  const { email, password } = parsed.data;
  const { user, tokens } = await AuthService.loginUser(req.tenantId ?? env.DEFAULT_TENANT_ID, email, password);
  
  setTokenCookies(res, tokens.refreshToken);
  return ApiResponse.ok(res, "Login successful", { user, accessToken: tokens.accessToken });
});

export const refreshToken = AsyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized("No refresh token");
  
  try {
    const payload = verifyRefreshToken(token);
    
    // 🚀 CRITICAL FIX: Fetch user from DB to get their LATEST organization/tenant ID
    const user = await User.findById(payload.userId);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    const tokens = generateTokenPair({ 
      userId: user._id.toString(), 
      email: user.email, 
      tenantId: user.tenantId // <-- This guarantees the token stays synced with the DB
    });
    
    setTokenCookies(res, tokens.refreshToken);
    return ApiResponse.ok(res, "Refreshed", { accessToken: tokens.accessToken });
  } catch (err) {
    res.clearCookie("refreshToken", getClearCookieOptions());
    throw ApiError.unauthorized("Invalid token");
  }
});

export const logout = AsyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", getClearCookieOptions());
  return ApiResponse.ok(res, "Logged out successfully");
});

export const googleLogin = AsyncHandler(async (req: Request, res: Response) => {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(500, "Google Auth is not configured. Missing GOOGLE_CLIENT_ID.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state: encodeOAuthState(req.tenantId ?? env.DEFAULT_TENANT_ID),
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

export const googleCallback = AsyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const frontendOrigin = env.CORS_ORIGIN || "http://localhost:5173";

  // On any error, redirect to login with an error flag
  if (!code) {
    return res.redirect(`${frontendOrigin}/login?error=google_auth_failed`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });
    
    if (!tokenRes.ok) return res.redirect(`${frontendOrigin}/login?error=google_token_failed`);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect(`${frontendOrigin}/login?error=google_token_missing`);

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { 
      headers: { Authorization: `Bearer ${tokenData.access_token}` } 
    });
    
    if (!profileRes.ok) return res.redirect(`${frontendOrigin}/login?error=google_profile_failed`);
    const profile = await profileRes.json();
    if (!profile.id || !profile.email) return res.redirect(`${frontendOrigin}/login?error=google_profile_incomplete`);
    
    const { tokens } = await AuthService.findOrCreateGoogleUser({
      tenantId: decodeOAuthState(state),
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatar: profile.picture,
    });

    // Set the refresh token as an HttpOnly cookie
    setTokenCookies(res, tokens.refreshToken);

    // ✅ FIX: Redirect to /auth/success — this page calls /api/auth/refresh to get the
    // access token into memory, then /api/auth/me to load the user, then navigates to /workspace.
    return res.redirect(`${frontendOrigin}/auth/success`);
  } catch (error) {
    logger.error(error, "Google OAuth callback error");
    return res.redirect(`${frontendOrigin}/login?error=google_auth_exception`);
  }
});

export const getMe = AsyncHandler(async (req: Request, res: Response) => {
  return ApiResponse.ok(res, "User fetched", req.user);
});

export const updateProfile = AsyncHandler(async (req: Request, res: Response) => {
  const { name, bio, timezone } = req.body;
  const updateData: Partial<typeof User.prototype> = {};
  if (name) updateData.name = name;
  if (bio !== undefined) updateData.bio = bio; 
  if (timezone) updateData.timezone = timezone;

  if (req.file) {
    updateData.avatar = req.file.path; 
  }

  const userId = req.user?.id;
  const tenantId = req.tenantId;

  if (!userId || !tenantId) throw ApiError.unauthorized("Authentication required");

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, tenantId: tenantId }, 
    { $set: updateData },
    { new: true, runValidators: true } 
  );

  return ApiResponse.ok(res, "Profile updated", updatedUser);
});