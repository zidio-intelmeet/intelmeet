import { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { AsyncHandler } from "../utils/async-handler";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import Meeting from "../models/meeting.model";

// Validate incoming meeting data
const createMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  scheduledStartTime: z.string().datetime().optional(),
  scheduledEndTime: z.string().datetime().optional(),
});

export const createMeeting = AsyncHandler(async (req: Request, res: Response) => {
  const parsed = createMeetingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.issues);
  }

  const { title, description, scheduledStartTime, scheduledEndTime } = parsed.data;
  const hostId = req.user?.id;
  const tenantId = req.tenantId;

  if (!hostId || !tenantId) {
    throw ApiError.unauthorized("Authentication required");
  }

  // Generate a unique 9-character meeting ID (e.g., "a1b2-c3d4")
  const rawId = crypto.randomBytes(4).toString("hex");
  const meetingId = `${rawId.slice(0, 4)}-${rawId.slice(4)}`;

  // Set default times if not provided (Start now, end in 1 hour)
  const start = scheduledStartTime ? new Date(scheduledStartTime) : new Date();
  const end = scheduledEndTime ? new Date(scheduledEndTime) : new Date(start.getTime() + 60 * 60 * 1000);

  const newMeeting = await Meeting.create({
    tenantId,
    meetingId,
    title,
    description,
    host: hostId,
    participants: [hostId], // The host is automatically a participant
    status: "Scheduled",
    scheduledStartTime: start,
    scheduledEndTime: end,
  });

  return ApiResponse.created(res, "Meeting created successfully", {
    meeting: newMeeting,
    joinUrl: `/meeting/${meetingId}` // Frontend route format
  });
});

export const getMeetingById = AsyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const tenantId = req.tenantId;

  if (!tenantId) throw ApiError.unauthorized("Tenant context missing");

  // Populate the host info so the frontend can display who created it
  const meeting = await Meeting.findOne({ meetingId, tenantId })
    .populate("host", "name avatar email");

  if (!meeting) {
    throw ApiError.notFound("Meeting not found or has been removed");
  }

  return ApiResponse.ok(res, "Meeting retrieved successfully", { meeting });
});