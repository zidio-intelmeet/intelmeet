import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

// For invite tokens — generate plain + store hash
export const generateInviteToken = (): {
  plain: string;
  hashed: string;
} => {
  const plain = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(plain).digest("hex");
  return { plain, hashed };
};

export const hashToken = (plain: string): string => {
  return crypto.createHash("sha256").update(plain).digest("hex");
};