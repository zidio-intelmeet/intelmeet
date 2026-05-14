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

// ─── CREATE MEETING ──────────────────────────────────────────
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

  if (req.user?.role !== "Admin") {
    throw ApiError.forbidden("Only Admins can create meetings");
  }

  // Generate a unique 9-character meeting code (e.g., "a1b2-c3d4")
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
    participants: [hostId],
    status: "Scheduled",
    scheduledStartTime: start,
    scheduledEndTime: end,
  });

  const populated = await newMeeting.populate("host", "name avatar email");

  return ApiResponse.created(res, "Meeting created successfully", populated);
});

// ─── LIST ALL MEETINGS ───────────────────────────────────────
export const getMeetings = AsyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.unauthorized("Tenant context missing");

  const { status } = req.query;

  const filter: any = { tenantId };
  if (status) filter.status = status;

  const meetings = await Meeting.find(filter)
    .populate("host", "name avatar email")
    .populate("participants", "name avatar email")
    .sort({ scheduledStartTime: -1 });

  return ApiResponse.ok(res, "Meetings retrieved successfully", meetings);
});

// ─── GET MEETING BY _id ──────────────────────────────────────
export const getMeetingById = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;

  if (!tenantId) throw ApiError.unauthorized("Tenant context missing");

  const meeting = await Meeting.findOne({ _id: id, tenantId })
    .populate("host", "name avatar email")
    .populate("participants", "name avatar email");

  if (!meeting) {
    throw ApiError.notFound("Meeting not found or has been removed");
  }

  return ApiResponse.ok(res, "Meeting retrieved successfully", meeting);
});

// ─── GET MEETING BY JOIN CODE ────────────────────────────────
export const getMeetingByCode = AsyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const tenantId = req.tenantId;

  if (!tenantId) throw ApiError.unauthorized("Tenant context missing");

  const meeting = await Meeting.findOne({ meetingId: code, tenantId })
    .populate("host", "name avatar email")
    .populate("participants", "name avatar email");

  if (!meeting) {
    throw ApiError.notFound("Meeting not found. Check the code and try again.");
  }

  return ApiResponse.ok(res, "Meeting retrieved successfully", meeting);
});

// ─── UPDATE MEETING ──────────────────────────────────────────
export const updateMeeting = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user?.id;

  if (!tenantId || !userId) throw ApiError.unauthorized("Authentication required");

  const meeting = await Meeting.findOne({ _id: id, tenantId });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  // Only host or Admin can update
  if (meeting.host.toString() !== userId && req.user?.role !== "Admin") {
    throw ApiError.forbidden("Only the host or an Admin can update this meeting");
  }

  const { title, description, scheduledStartTime, scheduledEndTime } = req.body;

  if (title) meeting.title = title;
  if (description !== undefined) meeting.description = description;
  if (scheduledStartTime) meeting.scheduledStartTime = new Date(scheduledStartTime);
  if (scheduledEndTime) meeting.scheduledEndTime = new Date(scheduledEndTime);

  await meeting.save();

  const populated = await meeting.populate("host", "name avatar email");

  return ApiResponse.ok(res, "Meeting updated successfully", populated);
});

// ─── DELETE MEETING ──────────────────────────────────────────
export const deleteMeeting = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user?.id;

  if (!tenantId || !userId) throw ApiError.unauthorized("Authentication required");

  const meeting = await Meeting.findOne({ _id: id, tenantId });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  // Only host or Admin can delete, and only if not ongoing
  if (meeting.host.toString() !== userId && req.user?.role !== "Admin") {
    throw ApiError.forbidden("Only the host or an Admin can delete this meeting");
  }

  if (meeting.status === "Ongoing") {
    throw ApiError.badRequest("Cannot delete an ongoing meeting. End it first.");
  }

  await Meeting.findByIdAndDelete(id);

  return ApiResponse.ok(res, "Meeting deleted successfully");
});

// ─── START MEETING ───────────────────────────────────────────
export const startMeeting = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user?.id;

  if (!tenantId || !userId) throw ApiError.unauthorized("Authentication required");

  const meeting = await Meeting.findOne({ _id: id, tenantId });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (meeting.status === "Ongoing") {
    // Already live — just return it
    const populated = await meeting.populate("host", "name avatar email");
    return ApiResponse.ok(res, "Meeting is already live", populated);
  }

  if (meeting.status !== "Scheduled") {
    throw ApiError.badRequest(`Cannot start a meeting with status "${meeting.status}"`);
  }

  // Only host or Admin can start
  if (meeting.host.toString() !== userId && req.user?.role !== "Admin") {
    throw ApiError.forbidden("Only the host or an Admin can start this meeting");
  }

  meeting.status = "Ongoing";
  meeting.actualStartTime = new Date();
  await meeting.save();

  const populated = await meeting.populate("host", "name avatar email");

  return ApiResponse.ok(res, "Meeting started", populated);
});

// ─── END MEETING ─────────────────────────────────────────────
export const endMeeting = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user?.id;

  if (!tenantId || !userId) throw ApiError.unauthorized("Authentication required");

  const meeting = await Meeting.findOne({ _id: id, tenantId });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (meeting.status === "Completed") {
    const populated = await meeting.populate("host", "name avatar email");
    return ApiResponse.ok(res, "Meeting already ended", populated);
  }

  if (meeting.status !== "Ongoing" && meeting.status !== "Scheduled") {
    throw ApiError.badRequest(`Cannot end a meeting with status "${meeting.status}"`);
  }

  // Only host or Admin can end
  if (meeting.host.toString() !== userId && req.user?.role !== "Admin") {
    throw ApiError.forbidden("Only the host or an Admin can end this meeting");
  }

  meeting.status = "Completed";
  meeting.actualEndTime = new Date();
  await meeting.save();

  const populated = await meeting.populate("host", "name avatar email");

  return ApiResponse.ok(res, "Meeting ended", populated);
});

// ─── JOIN MEETING (add self as participant) ───────────────────
export const joinMeeting = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user?.id;

  if (!tenantId || !userId) throw ApiError.unauthorized("Authentication required");

  const meeting = await Meeting.findOne({ _id: id, tenantId });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (meeting.status === "Completed" || meeting.status === "Cancelled") {
    throw ApiError.badRequest("This meeting has already ended");
  }

  // Add participant if not already in the list
  const isAlreadyParticipant = meeting.participants.some(
    (p) => p.toString() === userId
  );

  if (!isAlreadyParticipant) {
    meeting.participants.push(userId as any);
    await meeting.save();
  }

  const populated = await meeting.populate([
    { path: "host", select: "name avatar email" },
    { path: "participants", select: "name avatar email" },
  ]);

  return ApiResponse.ok(res, "Joined meeting successfully", populated);
});