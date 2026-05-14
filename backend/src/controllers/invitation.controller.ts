/**
 * Invitation Controller - Handle member invitation acceptance
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { verifyInvitationToken } from "../utils/invitation";
import Organization from "../models/organization.model";
import User from "../models/user.model";

/**
 * Accept invitation and add user to organization
 * POST /api/invitations/accept
 */
export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, "Invitation token is required");
  }

  // Verify invitation token
  const payload = verifyInvitationToken(token);
  if (!payload) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  // Get current user
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new ApiError(401, "User must be logged in to accept invitation");
  }

  // Get organization
  const organization = await Organization.findById(payload.organizationId);
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  // Check if already a member
  const isMember = organization.members.some((m) => m.userId.toString() === userId);
  if (isMember) {
    return res.status(200).json(
      new ApiResponse(200, { organizationId: organization._id }, "Already a member of this organization")
    );
  }

  // Check if invitation exists and is pending
  const userEmail = (req as any).user?.email;
  const invitationIndex = organization.invitations.findIndex(
    (inv) => inv.email === userEmail && inv.status === "pending"
  );

  if (invitationIndex === -1) {
    throw new ApiError(400, "Valid pending invitation not found for this email");
  }

  // Update invitation status to accepted and add to members
  const updated = await Organization.findByIdAndUpdate(
    payload.organizationId,
    {
      $set: {
        [`invitations.${invitationIndex}.status`]: "accepted",
      },
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
  )
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  res.status(200).json(
    new ApiResponse(200, { organizationId: organization._id }, "Invitation accepted successfully")
  );
});

/**
 * Validate invitation token
 * GET /api/invitations/validate?token=...
 */
export const validateInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Invitation token is required");
  }

  const payload = verifyInvitationToken(token);
  if (!payload) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  // Get organization info
  const organization = await Organization.findById(payload.organizationId).select("name");
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        valid: true,
        memberEmail: payload.memberEmail,
        memberName: payload.memberName,
        organizationName: organization.name,
        organizationId: payload.organizationId,
        role: payload.role,
      },
      "Invitation is valid"
    )
  );
});
