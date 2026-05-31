import { Request, Response } from "express";
import { AsyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import Notification from "../models/notification.model";

// GET /api/notifications?limit=20 - Get all notifications for user
export const getNotifications = AsyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const userId = req.user!.id;
  const tenantId = req.tenantId || req.user!.tenantId;

  const notifications = await Notification.find({ tenantId, userId })
    .sort({ createdAt: -1 })
    .limit(limit);

  return ApiResponse.ok(res, "Notifications retrieved successfully", notifications);
});

// GET /api/notifications/unread-count - Get unread count
// ✅ FIX: returns { count } not { unreadCount } to match frontend api.ts
export const getUnreadCount = AsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const tenantId = req.tenantId || req.user!.tenantId;

  const count = await Notification.countDocuments({
    tenantId,
    userId,
    isRead: false,
  });

  return ApiResponse.ok(res, "Unread count retrieved", { count });
});

// PUT /api/notifications/:notificationId/read - Mark single notification as read
export const markAsRead = AsyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.user!.id;
  const tenantId = req.tenantId || req.user!.tenantId;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, tenantId, userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return ApiResponse.ok(res, "Notification marked as read", notification);
});

// PUT /api/notifications/read-all - Mark all notifications as read
export const markAllAsRead = AsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const tenantId = req.tenantId || req.user!.tenantId;

  await Notification.updateMany(
    { tenantId, userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return ApiResponse.ok(res, "All notifications marked as read");
});

// DELETE /api/notifications/:notificationId - Delete a notification
export const deleteNotification = AsyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.user!.id;
  const tenantId = req.tenantId || req.user!.tenantId;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    tenantId,
    userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return ApiResponse.ok(res, "Notification deleted successfully");
});
