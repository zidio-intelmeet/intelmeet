/**
 * Invitation Token Utility - Generate and verify invitation tokens for member signup
 */

import jwt from "jsonwebtoken";
import env from "../configs/env";

export interface InvitationTokenPayload {
  invitationId: string;
  organizationId: string;
  memberEmail: string;
  memberName: string;
  role: "Admin" | "Member" | "Viewer";
  type: "invitation";
}

/**
 * Generate invitation token for new members
 * This token is used in the invitation link and expires after 7 days
 */
export const generateInvitationToken = (payload: InvitationTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "7d",
    subject: payload.invitationId,
  });
};

/**
 * Verify and decode invitation token
 */
export const verifyInvitationToken = (token: string): InvitationTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as InvitationTokenPayload;
    if (decoded.type !== "invitation") {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate invitation link for email
 */
export const generateInvitationLink = (invitationToken: string, baseUrl?: string): string => {
  const url = baseUrl || env.CORS_ORIGIN || "http://localhost:5173";
  return `${url}/accept-invitation?token=${invitationToken}`;
};