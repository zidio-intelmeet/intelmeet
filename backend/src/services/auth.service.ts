import User from "../models/user.model";
import { hashPassword, comparePassword } from "../utils/hash";
import { generateTokenPair, JwtPayload } from "../utils/jwt";
import { ApiError } from "../utils/api-error";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildPayload = (
  userId: string,
  email: string,
  tenantId: string
): JwtPayload => ({
  userId,
  email,
  tenantId,
});

export const sanitizeUser = (user: {
  _id: { toString(): string };
  tenantId: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
}) => ({
  id: user._id.toString(),
  tenantId: user.tenantId,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  createdAt: user.createdAt,
});

export const registerUser = async (
  tenantId: string,
  name: string,
  email: string,
  password: string
) => {
  const normalizedEmail = normalizeEmail(email);
  const exists = await User.findOne({ tenantId, email: normalizedEmail });
  if (exists) throw ApiError.conflict("Email already registered");

  const hashed = await hashPassword(password);
  const user = await User.create({
    tenantId,
    name,
    email: normalizedEmail,
    password: hashed,
  });

  const tokens = generateTokenPair(
    buildPayload(user._id.toString(), user.email, user.tenantId)
  );

  return { user: sanitizeUser(user), tokens };
};

export const loginUser = async (
  tenantId: string,
  email: string,
  password: string
) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({
    tenantId,
    email: normalizedEmail,
  }).select("+password");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  if (!user.password) {
    throw ApiError.badRequest(
      "This account uses Google login. Please sign in with Google."
    );
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throw ApiError.unauthorized("Invalid email or password");

  const tokens = generateTokenPair(
    buildPayload(user._id.toString(), user.email, user.tenantId)
  );

  return { user: sanitizeUser(user), tokens };
};

export const findOrCreateGoogleUser = async (profile: {
  tenantId: string;
  googleId: string;
  email: string;
  name: string;
  avatar: string;
}) => {
  const normalizedEmail = normalizeEmail(profile.email);
  let user = await User.findOne({
    tenantId: profile.tenantId,
    googleId: profile.googleId,
  });

  if (!user) {
    const existing = await User.findOne({
      tenantId: profile.tenantId,
      email: normalizedEmail,
    });

    if (existing) {
      if (existing.googleId && existing.googleId !== profile.googleId) {
        throw ApiError.conflict(
          "This email is already linked to a different Google account"
        );
      }

      existing.googleId = profile.googleId;
      existing.avatar = existing.avatar ?? profile.avatar;
      await existing.save();
      user = existing;
    } else {
      user = await User.create({
        tenantId: profile.tenantId,
        name: profile.name,
        email: normalizedEmail,
        googleId: profile.googleId,
        avatar: profile.avatar,
        password: null,
      });
    }
  }

  const tokens = generateTokenPair(
    buildPayload(user._id.toString(), user.email, user.tenantId)
  );

  return { user: sanitizeUser(user), tokens };
};
