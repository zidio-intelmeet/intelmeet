import jwt from "jsonwebtoken";
import env from "../configs/env";

export interface InvitationTokenPayload {
  organizationId: string;
  invitationId: string;
  type: "organization_invitation";
  memberEmail: string;
  memberName: string;
  role: string;
}

/**
 * 🚀 SECURITY FIX: Restored signed JWTs to prevent forged base64 invitations
 */
export const generateInvitationToken = (payload: InvitationTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { 
    expiresIn: "7d",
    subject: payload.invitationId
  });
};

export const generateInvitationLink = (token: string): string => {
  const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
  return `${frontendUrl}/accept-invitation?token=${token}`;
};

export const verifyInvitationToken = (token: string): InvitationTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as InvitationTokenPayload;
    if (decoded.type !== "organization_invitation") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};