import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply auth and rate limiting
router.use(requireAuth);
router.use(apiRateLimiter);

// GET /api/notifications - Get all notifications
router.get("/", getNotifications);

// GET /api/notifications/unread/count - Get unread count
router.get("/unread/count", getUnreadCount);

// POST /api/notifications/:notificationId/read - Mark as read
router.post("/:notificationId/read", markAsRead);

// POST /api/notifications/read-all - Mark all as read
router.post("/read-all", markAllAsRead);

// DELETE /api/notifications/:notificationId - Delete notification
router.delete("/:notificationId", deleteNotification);

export default router;
