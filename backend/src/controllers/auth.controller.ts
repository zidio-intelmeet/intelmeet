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

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const encodeOAuthState = (tenantId: string) =>
  Buffer.from(JSON.stringify({ tenantId }), "utf8").toString("base64url");

const decodeOAuthState = (state: unknown): string => {
  if (typeof state !== "string" || state.trim() === "") {
    return env.DEFAULT_TENANT_ID;
  }
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { tenantId?: unknown };
    return normalizeTenantId(parsed.tenantId ?? env.DEFAULT_TENANT_ID);
  } catch {
    throw ApiError.badRequest("Invalid OAuth state");
  }
};

const setTokenCookies = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    // 🚀 FIX: Must be false on localhost (HTTP), true on production (HTTPS)
    secure: process.env.NODE_ENV === "production",
    // 🚀 FIX: 'lax' allows the cookie to be sent after the Google Auth redirect
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = AsyncHandler(async (req: Request, res: Response) => {
  // 🕵️ SPY LOG: Check incoming registration data
  console.log("➡️ [REGISTER] Incoming request body:", { ...req.body, password: "***" });

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("❌ [REGISTER] Validation Failed:", parsed.error.issues);
    throw ApiError.badRequest("Validation failed", parsed.error.issues);
  }

  const tenantId = req.tenantId ?? env.DEFAULT_TENANT_ID;
  const { name, email, password } = parsed.data;
  
  try {
    const { user, tokens } = await AuthService.registerUser(
      tenantId,
      name,
      email,
      password
    );
    
    console.log("✅ [REGISTER] User successfully saved to DB:", user.email);

    setTokenCookies(res, tokens.refreshToken);

    EmailService.sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error("⚠️ Failed to send welcome email:", err)
    );

    return ApiResponse.created(res, "Registration successful", {
      user,
      accessToken: tokens.accessToken,
    });
  } catch (error: any) {
    console.log("❌ [REGISTER] Database/Service Error:", error.message);
    throw error;
  }
});

export const login = AsyncHandler(async (req: Request, res: Response) => {
  // 🕵️ SPY LOG: Check incoming login data
  console.log(`➡️ [LOGIN] Attempting login for email: ${req.body?.email}`);

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("❌ [LOGIN] Validation Failed:", parsed.error.issues);
    throw ApiError.badRequest("Validation failed", parsed.error.issues);
  }

  const tenantId = req.tenantId ?? env.DEFAULT_TENANT_ID;
  const { email, password } = parsed.data;
  
  try {
    const { user, tokens } = await AuthService.loginUser(tenantId, email, password);
    
    console.log("✅ [LOGIN] Authentication successful for:", user.email);

    setTokenCookies(res, tokens.refreshToken);

    return ApiResponse.ok(res, "Login successful", {
      user,
      accessToken: tokens.accessToken,
    });
  } catch (error: any) {
    // 🕵️ SPY LOG: This tells us exactly WHY login failed (e.g. "User not found" or "Invalid password")
    console.log("❌ [LOGIN] Authentication Failed:", error.message);
    throw error;
  }
});

export const refreshToken = AsyncHandler(async (req: Request, res: Response) => {
    const refreshTokenFromCookie = req.cookies?.refreshToken;
    if (!refreshTokenFromCookie) {
      throw ApiError.unauthorized("Refresh token not found. Please login again.");
    }

    try {
      const payload = verifyRefreshToken(refreshTokenFromCookie);
      const tokens = generateTokenPair({
        userId: payload.userId,
        email: payload.email,
        tenantId: payload.tenantId,
      });

      setTokenCookies(res, tokens.refreshToken);

      return ApiResponse.ok(res, "Token refreshed successfully", {
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      res.clearCookie("refreshToken", { httpOnly: true, path: "/" });
      throw ApiError.unauthorized("Invalid refresh token. Please login again.");
    }
  }
);

export const logout = AsyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/"
  });
  return ApiResponse.ok(res, "Logged out successfully");
});

export const googleLogin = AsyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId ?? env.DEFAULT_TENANT_ID;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      state: encodeOAuthState(tenantId),
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }
);

export const googleCallback = AsyncHandler(async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      throw ApiError.badRequest("Authorization code missing");
    }

    const tenantId = decodeOAuthState(req.query.state);
    
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      throw ApiError.server("Failed to get Google access token");
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    const profile = await profileRes.json();
    if (!profile.id) {
      throw ApiError.server("Failed to get Google profile");
    }

    const { tokens } = await AuthService.findOrCreateGoogleUser({
      tenantId,
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatar: profile.picture,
    });

    setTokenCookies(res, tokens.refreshToken);

    const frontendOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
    res.redirect(`${frontendOrigin}/workspace`);
  }
);

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

  if (!updatedUser) throw ApiError.notFound("User not found");

  return ApiResponse.ok(res, "Profile updated successfully", {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    avatar: updatedUser.avatar,
    bio: updatedUser.bio,
    timezone: updatedUser.timezone,
    role: updatedUser.role,
  });
});