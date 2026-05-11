import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import Task from "../models/task.model";
import Meeting from "../models/meeting.model";

// GET all tasks for a meeting
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const { status, assignee } = req.query;
  const tenantId = req.headers["x-tenant-id"] as string;

  const filter: any = { tenantId, meetingId };
  if (status) filter.status = status;
  if (assignee) filter.assignee = assignee;

  const tasks = await Task.find(filter)
    .populate("assignee", "name avatar email")
    .populate("creator", "name avatar")
    .sort({ priority: 1, dueDate: 1 });

  res.status(200).json(
    new ApiResponse(200, tasks, "Tasks retrieved successfully")
  );
});

// GET task by ID
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const tenantId = req.headers["x-tenant-id"] as string;

  const task = await Task.findOne({ _id: taskId, tenantId })
    .populate("assignee", "name avatar email")
    .populate("creator", "name avatar");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json(
    new ApiResponse(200, task, "Task retrieved successfully")
  );
});

// POST create task
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { meetingId, title, description, assignee, priority, dueDate } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  // Verify meeting exists
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  const task = await Task.create({
    tenantId,
    meetingId,
    title,
    description: description || null,
    assignee,
    creator: userId,
    priority: priority || "Medium",
    dueDate: dueDate || null,
  });

  const populatedTask = await task.populate("assignee", "name avatar email");

  res.status(201).json(
    new ApiResponse(201, populatedTask, "Task created successfully")
  );
});

// PUT update task
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { title, description, assignee, status, priority, dueDate, notes, completedAt } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;

  const task = await Task.findOneAndUpdate(
    { _id: taskId, tenantId },
    {
      $set: {
        ...(title && { title }),
        ...(description && { description }),
        ...(assignee && { assignee }),
        ...(status && { status, completedAt: status === "Completed" ? new Date() : null }),
        ...(priority && { priority }),
        ...(dueDate && { dueDate }),
        ...(notes && { notes }),
      },
    },
    { new: true }
  )
    .populate("assignee", "name avatar email")
    .populate("creator", "name avatar");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json(
    new ApiResponse(200, task, "Task updated successfully")
  );
});

// DELETE task
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const tenantId = req.headers["x-tenant-id"] as string;

  const task = await Task.findOneAndDelete({
    _id: taskId,
    tenantId,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json(
    new ApiResponse(200, null, "Task deleted successfully")
  );
});
