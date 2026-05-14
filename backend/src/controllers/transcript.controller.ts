import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import Transcript from "../models/transcript.model";
import Meeting from "../models/meeting.model";

// GET all transcripts for a meeting
export const getTranscripts = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const tenantId = req.headers["x-tenant-id"] as string;

  const transcripts = await Transcript.find({
    tenantId,
    meetingId,
  })
    .populate("speaker", "name avatar")
    .sort({ startTime: 1 });

  res.status(200).json(
    new ApiResponse(200, transcripts, "Transcripts retrieved successfully")
  );
});

// GET single transcript
export const getTranscriptById = asyncHandler(
  async (req: Request, res: Response) => {
    const { transcriptId } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;

    const transcript = await Transcript.findOne({
      _id: transcriptId,
      tenantId,
    }).populate("speaker", "name avatar");

    if (!transcript) {
      throw new ApiError(404, "Transcript not found");
    }

    res.status(200).json(
      new ApiResponse(200, transcript, "Transcript retrieved successfully")
    );
  }
);

// POST create transcript (from AI)
export const createTranscript = asyncHandler(
  async (req: Request, res: Response) => {
    const { meetingId, speaker, text, startTime, endTime, language, confidence } =
      req.body;
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = (req as any).user.id;

    // Verify meeting exists
    const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const transcript = await Transcript.create({
      tenantId,
      meetingId,
      speaker: speaker || userId,
      text,
      startTime,
      endTime,
      language: language || "en",
      confidence: confidence || 1,
    });

    res.status(201).json(
      new ApiResponse(201, transcript, "Transcript created successfully")
    );
  }
);

// DELETE transcript
export const deleteTranscript = asyncHandler(
  async (req: Request, res: Response) => {
    const { transcriptId } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;

    const transcript = await Transcript.findOneAndDelete({
      _id: transcriptId,
      tenantId,
    });

    if (!transcript) {
      throw new ApiError(404, "Transcript not found");
    }

    res.status(200).json(
      new ApiResponse(200, null, "Transcript deleted successfully")
    );
  }
);
