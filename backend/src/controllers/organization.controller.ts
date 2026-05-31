import { Request, Response } from "express";
import crypto from "crypto";
import { AsyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import Organization from "../models/organization.model";
import User from "../models/user.model";
import EmailService from "../services/email.service";
import { generateInvitationToken, generateInvitationLink, InvitationTokenPayload } from "../utils/invitation";

// GET all organizations for user
export const getOrganizations = AsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const organizations = await Organization.find({
    $or: [{ owner: userId }, { "members.userId": userId }],
  })
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  return res.status(200).json(new ApiResponse(200, organizations, "Organizations retrieved successfully"));
});

// GET /api/organizations/me - Get the single organization the current user belongs to
// ✅ FIX: Added this endpoint - api.ts calls GET /api/organizations/me
export const getMyOrganization = AsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const organization = await Organization.findOne({
    $or: [{ owner: userId }, { "members.userId": userId }],
  })
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  return res.status(200).json(new ApiResponse(200, organization || null, "Organization retrieved successfully"));
});

// GET organization by slug
export const getOrganizationBySlug = AsyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const organization = await Organization.findOne({ slug })
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  if (!organization) throw new ApiError(404, "Organization not found");
  return res.status(200).json(new ApiResponse(200, organization, "Organization retrieved successfully"));
});

// POST create organization
export const createOrganization = AsyncHandler(async (req: Request, res: Response) => {
  const { name, description, slug } = req.body;
  const userId = req.user!.id;
  
  const generatedSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let finalSlug = generatedSlug || "org";
  
  // Ensure unique slug
  let isUnique = false;
  while (!isUnique) {
    const existing = await Organization.findOne({ slug: finalSlug });
    if (!existing) isUnique = true;
    else finalSlug = `${generatedSlug}-${crypto.randomBytes(3).toString('hex')}`;
  }

  const organization = await Organization.create({
    tenantId: finalSlug,
    name,
    slug: finalSlug,
    description: description || null,
    owner: userId,
    members: [{ userId, role: "Admin", status: "active" }],
  });

  await User.findByIdAndUpdate(userId, { tenantId: finalSlug, role: "Admin" });
  const populated = await organization.populate("owner", "name avatar email");

  res.status(201).json(new ApiResponse(201, populated, "Organization created successfully"));
});

// PUT update organization
export const updateOrganization = AsyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { name, description, isPrivate, allowPublicJoin, defaultMeetingDuration } = req.body;
  const userId = req.user!.id;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) throw new ApiError(404, "Organization not found");
  if (organization.owner.toString() !== userId) throw new ApiError(403, "Only owner can update organization");

  const updated = await Organization.findByIdAndUpdate(
    orgId,
    {
      $set: {
        ...(name && { name }),
        ...(description && { description }),
        ...(isPrivate !== undefined && { "settings.isPrivate": isPrivate }),
        ...(allowPublicJoin !== undefined && { "settings.allowPublicJoin": allowPublicJoin }),
        ...(defaultMeetingDuration && { "settings.defaultMeetingDuration": defaultMeetingDuration }),
      },
    },
    { new: true }
  ).populate("owner", "name avatar email").populate("members.userId", "name avatar email");

  res.status(200).json(new ApiResponse(200, updated, "Organization updated successfully"));
});

// POST add member to organization
export const addMember = AsyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { email, role } = req.body;
  const adminId = req.user!.id;
  const adminUser = req.user!;

  if (!email) throw new ApiError(400, "Email is required");

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) throw new ApiError(404, "Organization not found");

  // Type safe iterator
  const adminRole = organization.members.find((m: any) => m.userId.toString() === adminId)?.role;
  if (adminRole !== "Admin" && organization.owner.toString() !== adminId) {
    throw new ApiError(403, "Only admins can add members");
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail, tenantId: organization.tenantId });
  
  if (existingUser) {
    const isMember = organization.members.some((m: any) => m.userId.toString() === existingUser._id.toString());
    if (isMember) throw new ApiError(400, "User is already a member");
  }

  const existingInvite = organization.invitations?.find((inv: any) => inv.email === normalizedEmail && inv.status === "pending");
  if (existingInvite) throw new ApiError(400, "Invitation already sent to this email");

  const memberRole = (role as "Admin" | "Member" | "Viewer") || "Member";
  
  const updated = await Organization.findByIdAndUpdate(
    orgId,
    {
      $push: {
        invitations: {
          email: normalizedEmail,
          role: memberRole,
          invitedBy: adminId,
          invitedAt: new Date(),
          status: "pending",
        },
      },
    },
    { new: true }
  ).populate("owner", "name avatar email").populate("members.userId", "name avatar email");

  // Create Token Payload
  const invitationTokenPayload: InvitationTokenPayload = {
    organizationId: orgId.toString(),
    invitationId: `${orgId}-${normalizedEmail}`,
    memberEmail: normalizedEmail,
    memberName: normalizedEmail.split('@')[0],
    role: memberRole,
    type: "organization_invitation",
  };

  const invitationToken = generateInvitationToken(invitationTokenPayload);
  const invitationLink = generateInvitationLink(invitationToken);

  // Send Email
  await EmailService.sendInvitationEmail({
    memberEmail: normalizedEmail,
    memberName: normalizedEmail.split('@')[0],
    adminName: adminUser.name || "Admin",
    organizationName: organization.name,
    invitationLink,
  });

  res.status(201).json(new ApiResponse(201, updated, "Invitation sent"));
});

// DELETE remove member from organization
export const removeMember = AsyncHandler(async (req: Request, res: Response) => {
  const { orgId, memberId } = req.params;
  const userId = req.user!.id;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) throw new ApiError(404, "Organization not found");
  if (organization.owner.toString() !== userId) throw new ApiError(403, "Only owner can remove members");

  const updated = await Organization.findByIdAndUpdate(
    orgId,
    { $pull: { members: { userId: memberId } } },
    { new: true }
  ).populate("owner", "name avatar email").populate("members.userId", "name avatar email");

  res.status(200).json(new ApiResponse(200, updated, "Member removed successfully"));
});

// DELETE organization
export const deleteOrganization = AsyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const userId = req.user!.id;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) throw new ApiError(404, "Organization not found");
  if (organization.owner.toString() !== userId) throw new ApiError(403, "Only owner can delete organization");

  await Organization.findByIdAndDelete(orgId);
  res.status(200).json(new ApiResponse(200, null, "Organization deleted successfully"));
});