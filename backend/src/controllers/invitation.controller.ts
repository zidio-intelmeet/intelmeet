import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { verifyInvitationToken, generateInvitationToken, InvitationTokenPayload } from "../utils/invitation";
import Organization from "../models/organization.model";
import User from "../models/user.model";

export const getPendingInvitations = asyncHandler(async (req: Request, res: Response) => {
  const userEmail = req.user?.email;
  const requestedEmail = req.query.email as string;

  if (req.user?.role !== "Admin" && requestedEmail && requestedEmail !== userEmail) {
    throw new ApiError(403, "You are not authorized to view invitations for this email.");
  }

  const targetEmail = (requestedEmail || userEmail)?.toLowerCase();
  if (!targetEmail) throw new ApiError(400, "Email context missing");

  const organizations = await Organization.find({
    invitations: {
      $elemMatch: {
        email: targetEmail,
        status: "pending"
      }
    }
  }).populate("owner", "name avatar email");

  const pendingInvites = organizations.map((org: any) => {
    const invite = org.invitations.find((i: any) => i.email === targetEmail && i.status === "pending");
    
    // 🚀 CRITICAL FIX: Generate the token here so the frontend can inject it into the URL
    const invitationTokenPayload: InvitationTokenPayload = {
      organizationId: org._id.toString(),
      invitationId: `${org._id}-${targetEmail}`,
      type: "organization_invitation",
      memberEmail: targetEmail,
      memberName: targetEmail.split('@')[0],
      role: invite?.role || "Member",
    };
    const token = generateInvitationToken(invitationTokenPayload);

    return {
      _id: token, // Sent as _id so the dashboard's navigate(token=${invite._id}) works perfectly
      organizationId: org._id,
      organizationName: org.name,
      invitedBy: org.owner,
      role: invite?.role,
      invitedAt: invite?.invitedAt
    };
  });

  return res.status(200).json(new ApiResponse(200, pendingInvites, "Invitations retrieved"));
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const userId = req.user?.id;

  if (!token || !userId) throw new ApiError(400, "Token and user ID required");

  const payload = verifyInvitationToken(token);
  if (!payload) throw new ApiError(400, "Invalid or expired token");

  const organization = await Organization.findOneAndUpdate(
    { 
      _id: payload.organizationId,
      "invitations.email": payload.memberEmail 
    },
    {
      $set: { "invitations.$.status": "accepted" },
      $push: {
        members: {
          userId,
          role: payload.role,
          status: "active",
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  ).populate("owner", "name avatar email").populate("members.userId", "name avatar email");

  if (!organization) throw new ApiError(404, "Organization or invitation not found");

  // Sync user's tenantId and role with the organization they just joined
  const userRole = payload.role === "Admin" ? "Admin" : "Member";
  await User.findByIdAndUpdate(userId, {
    tenantId: organization.tenantId,
    role: userRole
  });

  return res.status(200).json(new ApiResponse(200, { organizationId: organization._id }, "Invitation accepted"));
});

export const validateInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (typeof token !== "string") throw new ApiError(400, "Token required");

  const payload = verifyInvitationToken(token);
  if (!payload) throw new ApiError(400, "Invalid or expired token");

  const organization = await Organization.findById(payload.organizationId).select("name");
  if (!organization) throw new ApiError(404, "Org not found");

  return res.status(200).json(new ApiResponse(200, {
    valid: true,
    memberEmail: payload.memberEmail,
    organizationName: organization.name,
    organizationId: organization._id,
    role: payload.role
  }, "Token valid"));
});