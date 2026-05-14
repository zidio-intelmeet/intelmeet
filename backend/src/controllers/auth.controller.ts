import { Request, Response } from "express";
import { z } from "zod";
import * as AuthService from "../services/auth.service";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { verifyRefreshToken, generateTokenPair } from "../utils/jwt";
import { AsyncHandler } from "../utils/async-handler";
import env from "../configs/env";
import { normalizeTenantId } from "../middlewares/tenant.middleware";
import User from "../models/user.model"; // <-- Added User model import

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
  // Refresh token: httpOnly (secure, not accessible to JavaScript)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production", // false in dev (localhost), true in prod (HTTPS)
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax", // 'lax' for dev (localhost with different ports), 'strict' for prod
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = AsyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.issues);
  }

  const tenantId = req.tenantId ?? env.DEFAULT_TENANT_ID;
  const { name, email, password } = parsed.data;
  const { user, tokens } = await AuthService.registerUser(
    tenantId,
    name,
    email,
    password
  );

  setTokenCookies(res, tokens.refreshToken);

  return ApiResponse.created(res, "Registration successful", {
    user,
    accessToken: tokens.accessToken,
  });
});

export const login = AsyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.issues);
  }

  const tenantId = req.tenantId ?? env.DEFAULT_TENANT_ID;
  const { email, password } = parsed.data;
  const { user, tokens } = await AuthService.loginUser(
    tenantId,
    email,
    password
  );

  setTokenCookies(res, tokens.refreshToken);

  return ApiResponse.ok(res, "Login successful", {
    user,
    accessToken: tokens.accessToken,
  });
});

export const refreshToken = AsyncHandler(
  async (req: Request, res: Response) => {
    // Read refresh token from httpOnly cookie (automatically sent by browser)
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

      // Set new refresh token in cookie
      setTokenCookies(res, tokens.refreshToken);

      return ApiResponse.ok(res, "Token refreshed successfully", {
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      // Clear invalid refresh token
      res.clearCookie("refreshToken", { httpOnly: true, path: "/" });
      throw ApiError.unauthorized("Invalid refresh token. Please login again.");
    }
  }
);

export const logout = AsyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return ApiResponse.ok(res, "Logged out successfully");
});

export const googleLogin = AsyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = req.tenantId ?? env.DEFAULT_TENANT_ID;
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      state: encodeOAuthState(tenantId),
    });
    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
  }
);

export const googleCallback = AsyncHandler(
  async (req: Request, res: Response) => {
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
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      throw ApiError.server("Failed to get Google access token");
    }

    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
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

    // Set both access token and refresh token as HttpOnly cookies
  res.cookie("refreshToken", tokens, {
  httpOnly: true,
  secure: false, // Set to true only in production (HTTPS)
  sameSite: "lax", // Crucial for localhost port sharing
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

    // Redirect to auth success page with minimal info (only tenantId)
    res.redirect(`${env.CORS_ORIGIN}/auth/success?tenantId=${encodeURIComponent(tenantId)}`);
  }
);

export const getMe = AsyncHandler(async (req: Request, res: Response) => {
  return ApiResponse.ok(res, "User fetched", req.user);
});

// --- NEW PROFILE UPDATE CONTROLLER ---
export const updateProfile = AsyncHandler(async (req: Request, res: Response) => {
  // 1. Extract text fields from the request body
  const { name, bio, timezone } = req.body;

  // 2. Build the update object dynamically
  const updateData: Partial<typeof User.prototype> = {};
  if (name) updateData.name = name;
  if (bio !== undefined) updateData.bio = bio; 
  if (timezone) updateData.timezone = timezone;

  // 3. Handle the uploaded avatar URL from Cloudinary
  if (req.file) {
    updateData.avatar = req.file.path; 
  }

  // 4. Get identifiers from your requireAuth middleware
  const userId = req.user?.id;
  const tenantId = req.tenantId;

  if (!userId || !tenantId) {
    throw ApiError.unauthorized("Authentication required");
  }

  // 5. Update the user in the database
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, tenantId: tenantId }, 
    { $set: updateData },
    { new: true, runValidators: true } 
  );

  if (!updatedUser) {
    throw ApiError.notFound("User not found");
  }

  // 6. Send back standardized API response using your ApiResponse wrapper
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