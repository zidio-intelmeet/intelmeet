import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import Organization from "../models/organization.model";
import User from "../models/user.model";
import EmailService from "../services/email.service";
import { generateInvitationToken, generateInvitationLink } from "../utils/invitation";

// GET all organizations for user
export const getOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  const organizations = await Organization.find({
    $or: [
      { owner: userId },
      { "members.userId": userId },
    ],
  })
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  res.status(200).json(
    new ApiResponse(200, organizations, "Organizations retrieved successfully")
  );
});

// GET organization by slug
export const getOrganizationBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const organization = await Organization.findOne({ slug })
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  res.status(200).json(
    new ApiResponse(200, organization, "Organization retrieved successfully")
  );
});

// POST create organization
export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, slug } = req.body;
  // Generate slug from name: lowercase, replace spaces/special chars with hyphens, remove invalid chars
  const generatedSlug = (slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace any non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
  
  const userId = (req as any).user.id;

  // Check if slug already exists
  const existing = await Organization.findOne({ slug: generatedSlug });
  if (existing) {
    throw new ApiError(400, "Organization slug already exists");
  }

  const organization = await Organization.create({
    tenantId: generatedSlug,
    name,
    slug: generatedSlug,
    description: description || null,
    owner: userId,
    members: [
      {
        userId,
        role: "Admin",
        joinedAt: new Date(),
      },
    ],
  });

  const populated = await organization.populate("owner", "name avatar email");

  res.status(201).json(
    new ApiResponse(201, populated, "Organization created successfully")
  );
});

// PUT update organization
export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { name, description, isPrivate, allowPublicJoin, defaultMeetingDuration } = req.body;
  const userId = (req as any).user.id;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  // Only owner can update
  if (organization.owner.toString() !== userId) {
    throw new ApiError(403, "Only owner can update organization");
  }

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
  )
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  res.status(200).json(
    new ApiResponse(200, updated, "Organization updated successfully")
  );
});

// POST add member to organization
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { email, userId: memberId, role, name } = req.body;
  const adminId = (req as any).user.id;
  const adminUser = (req as any).user;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  // Only owner/admin can add members
  const adminRole = organization.members.find((m) => m.userId.toString() === adminId)?.role;
  if (adminRole !== "Admin" && organization.owner.toString() !== adminId) {
    throw new ApiError(403, "Only admins can add members");
  }

  let finalMemberId = memberId;

  // If email is provided, find or create the user
  if (email && !memberId) {
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create a placeholder user for invitation
      user = await User.create({
        tenantId: organization.tenantId,
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password: "pending", // Placeholder - will be set when user signs up
        isInvited: true,
      });
    }
    
    finalMemberId = user._id;
  } else if (!finalMemberId) {
    throw new ApiError(400, "Either email or userId is required");
  }

  // Check if already member
  const isMember = organization.members.some((m) => m.userId.toString() === finalMemberId);
  if (isMember) {
    throw new ApiError(400, "User is already a member");
  }

  const memberRole = role || "Member";
  const updated = await Organization.findByIdAndUpdate(
    orgId,
    {
      $push: {
        members: {
          userId: finalMemberId,
          role: memberRole,
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  )
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  // Get member details
  const memberUser = await User.findById(finalMemberId).select("name email");
  const ownerUser = (req as any).user;

  // Send invitation email with token
  if (memberUser && memberUser.email) {
    const invitationTokenPayload = {
      invitationId: `${orgId}-${finalMemberId}`,
      organizationId: orgId,
      memberEmail: memberUser.email,
      memberName: memberUser.name || memberUser.email,
      role: memberRole as "Admin" | "Member" | "Viewer",
      type: "invitation" as const,
    };

    const invitationToken = generateInvitationToken(invitationTokenPayload);
    const invitationLink = generateInvitationLink(
      invitationToken,
      process.env.FRONTEND_URL
    );

    // Send email
    await EmailService.sendInvitationEmail({
      memberEmail: memberUser.email,
      memberName: memberUser.name || memberUser.email,
      adminEmail: ownerUser.email,
      adminName: ownerUser.name || "Admin",
      organizationName: organization.name,
      invitationToken,
      invitationLink,
    });
  }

  res.status(201).json(
    new ApiResponse(201, updated, "Member invitation sent successfully")
  );
});

// DELETE remove member from organization
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { orgId, memberId } = req.params;
  const userId = (req as any).user.id;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  // Only owner can remove members
  if (organization.owner.toString() !== userId) {
    throw new ApiError(403, "Only owner can remove members");
  }

  const updated = await Organization.findByIdAndUpdate(
    orgId,
    { $pull: { members: { userId: memberId } } },
    { new: true }
  )
    .populate("owner", "name avatar email")
    .populate("members.userId", "name avatar email");

  res.status(200).json(
    new ApiResponse(200, updated, "Member removed successfully")
  );
});

// DELETE organization
export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const userId = (req as any).user.id;

  const organization = await Organization.findOne({ _id: orgId });
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  // Only owner can delete
  if (organization.owner.toString() !== userId) {
    throw new ApiError(403, "Only owner can delete organization");
  }

  await Organization.findByIdAndDelete(orgId);

  res.status(200).json(
    new ApiResponse(200, null, "Organization deleted successfully")
  );
});
