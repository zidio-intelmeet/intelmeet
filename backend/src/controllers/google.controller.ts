/**
 * NOTE: This file is currently unused. Google OAuth is handled by
 * auth.controller.ts via /api/auth/google and /api/auth/google/callback.
 *
 * This file is kept here for reference and is kept in sync with the
 * rest of the auth system to avoid issues if ever re-enabled.
 */
import { Request, Response } from "express";
import { AsyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import User from "../models/user.model";
import { generateTokenPair } from "../utils/jwt";
import env from "../configs/env";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as "strict" | "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Initiates the Google OAuth 2.0 flow
export const initGoogleAuth = AsyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req.query.tenantId as string) || env.DEFAULT_TENANT_ID;
    const clientId = env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        throw new ApiError(500, "Google Auth is not configured on the server. Missing GOOGLE_CLIENT_ID.");
    }

    const redirectUri = env.GOOGLE_CALLBACK_URL;
    const scope = "email profile";

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account&state=${encodeURIComponent(tenantId)}`;

    res.redirect(googleAuthUrl);
});

// Handles the callback from Google
export const googleAuthCallback = AsyncHandler(async (req: Request, res: Response) => {
    const { code, state: tenantId } = req.query;
    const frontendUrl = env.CORS_ORIGIN || "http://localhost:5173";

    if (!code) {
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = env.GOOGLE_CALLBACK_URL;

    try {
        // 1. Exchange authorization code for access token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code as string,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) return res.redirect(`${frontendUrl}/login?error=google_token_failed`);
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) return res.redirect(`${frontendUrl}/login?error=google_token_missing`);

        // 2. Fetch user profile from Google
        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!profileResponse.ok) return res.redirect(`${frontendUrl}/login?error=google_profile_failed`);
        const profileData = await profileResponse.json();
        if (!profileData.id || !profileData.email) return res.redirect(`${frontendUrl}/login?error=google_profile_incomplete`);

        // 3. Find or Create User in the database
        let user = await User.findOne({ googleId: profileData.id });
        if (!user) {
            const existing = await User.findOne({ email: profileData.email.toLowerCase() });
            if (existing) {
                existing.googleId = profileData.id;
                existing.avatar = existing.avatar ?? profileData.picture;
                await existing.save();
                user = existing;
            } else {
                user = await User.create({
                    name: profileData.name,
                    email: profileData.email.toLowerCase(),
                    avatar: profileData.picture,
                    googleId: profileData.id,
                    tenantId: typeof tenantId === "string" ? tenantId.trim() || env.DEFAULT_TENANT_ID : env.DEFAULT_TENANT_ID,
                    role: "Member",
                    password: null,
                });
            }
        }

        // 4. Generate token pair using the correct JWT utility (correct secret + payload format)
        const tokens = generateTokenPair({
            userId: user._id.toString(),
            email: user.email,
            tenantId: user.tenantId,
        });

        // 5. Set refresh token as HttpOnly cookie (same pattern as the main auth controller)
        res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS);

        // 6. Redirect to /auth/success so the frontend bootstraps auth state
        return res.redirect(`${frontendUrl}/auth/success`);
    } catch (error) {
        return res.redirect(`${frontendUrl}/login?error=google_auth_exception`);
    }
});