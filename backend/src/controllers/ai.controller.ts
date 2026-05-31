import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import AIService from "../services/ai.service";
import Meeting from "../models/meeting.model";
import Transcript from "../models/transcript.model";

// POST /api/ai/transcribe - Generate transcript for meeting
export const createTranscript = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId, transcript } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  // Verify meeting exists and user is host
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  if (meeting.host.toString() !== userId) {
    throw new ApiError(403, "Only meeting host can generate transcript");
  }

  try {
    // For now, accept transcript text directly from frontend
    // In production, this would process actual audio
    await Meeting.findByIdAndUpdate(meetingId, {
      $set: { transcript },
    });

    res.status(201).json(
      new ApiResponse(201, { meetingId, transcript }, "Transcript created successfully")
    );
  } catch (error: any) {
    throw new ApiError(500, `Transcript generation failed: ${error.message}`);
  }
});

// POST /api/ai/summarize - Generate AI summary
export const generateSummary = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  // Verify meeting exists
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  // Check if transcript exists
  if (!meeting.transcript) {
    throw new ApiError(400, "No transcript available for summarization");
  }

  try {
    console.log("📝 Starting summary generation for meeting:", meetingId);

    const summary = await AIService.generateSummary(
      meetingId.toString(),
      meeting.transcript,
      tenantId
    );

    res.status(200).json(
      new ApiResponse(
        200,
        { meetingId, summary },
        "Summary generated successfully"
      )
    );
  } catch (error: any) {
    throw new ApiError(500, `Summary generation failed: ${error.message}`);
  }
});

// POST /api/ai/extract-actions - Extract action items
export const extractActionItems = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;

  // Verify meeting exists
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  // Check if transcript exists
  if (!meeting.transcript) {
    throw new ApiError(400, "No transcript available for action item extraction");
  }

  try {
    console.log("✅ Extracting action items for meeting:", meetingId);

    const actionItems = await AIService.extractActionItems(
      meetingId.toString(),
      meeting.transcript,
      tenantId
    );

    res.status(200).json(
      new ApiResponse(
        200,
        { meetingId, actionItems },
        "Action items extracted successfully"
      )
    );
  } catch (error: any) {
    throw new ApiError(500, `Action item extraction failed: ${error.message}`);
  }
});

// POST /api/ai/sentiment - Analyze meeting sentiment
export const analyzeSentiment = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;

  // Verify meeting exists
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  // Check if transcript exists
  if (!meeting.transcript) {
    throw new ApiError(400, "No transcript available for sentiment analysis");
  }

  try {
    console.log("😊 Starting sentiment analysis for meeting:", meetingId);

    const sentiment = await AIService.analyzeSentiment(meeting.transcript);

    res.status(200).json(
      new ApiResponse(
        200,
        { meetingId, sentiment },
        "Sentiment analysis completed"
      )
    );
  } catch (error: any) {
    throw new ApiError(500, `Sentiment analysis failed: ${error.message}`);
  }
});

// GET /api/ai/summary/:meetingId - Get meeting summary
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const tenantId = req.tenantId || req.user!.tenantId;

  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  if (!meeting.summary) {
    throw new ApiError(404, "Summary not available");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { meetingId, summary: meeting.summary, actionItems: meeting.actionItems },
      "Summary retrieved successfully"
    )
  );
});

// GET /api/ai/transcript/:meetingId - Get transcript for a meeting
// ✅ FIX: api.ts calls getTranscript(meetingId) → GET /api/ai/transcript/:meetingId
export const getTranscript = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const tenantId = req.tenantId || req.user!.tenantId;

  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: meeting._id,
        meetingId: meeting._id,
        fullText: meeting.transcript || "",
        summary: meeting.summary || null,
        actionItems: meeting.actionItems || [],
        keyTopics: [],
        processingStatus: meeting.transcript ? "completed" : "pending",
      },
      "Transcript retrieved successfully"
    )
  );
});
