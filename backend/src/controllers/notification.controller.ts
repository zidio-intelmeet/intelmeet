import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import Notification from "../models/notification.model";

// GET all notifications for user
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { isRead } = req.query;
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  const filter: any = { tenantId, userId };
  if (isRead !== undefined) filter.isRead = isRead === "true";

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json(
    new ApiResponse(200, notifications, "Notifications retrieved successfully")
  );
});

// GET unread count
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  const count = await Notification.countDocuments({
    tenantId,
    userId,
    isRead: false,
  });

  res.status(200).json(
    new ApiResponse(200, { unreadCount: count }, "Unread count retrieved")
  );
});

// POST mark notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, tenantId, userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});

// POST mark all as read
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  await Notification.updateMany(
    { tenantId, userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  res.status(200).json(
    new ApiResponse(200, null, "All notifications marked as read")
  );
});

// DELETE notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const tenantId = req.headers["x-tenant-id"] as string;
  const userId = (req as any).user.id;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    tenantId,
    userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res.status(200).json(
    new ApiResponse(200, null, "Notification deleted successfully")
  );
});
