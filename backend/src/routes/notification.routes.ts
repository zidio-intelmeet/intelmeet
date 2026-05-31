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

// GET /api/notifications?limit=20 - Get all notifications
router.get("/", getNotifications);

// GET /api/notifications/unread-count - Get unread count
// ✅ FIX: was /unread/count — frontend calls /unread-count
router.get("/unread-count", getUnreadCount);

// PUT /api/notifications/read-all - Mark all as read
// ✅ FIX: was POST — frontend calls PUT
router.put("/read-all", markAllAsRead);

// PUT /api/notifications/:notificationId/read - Mark as read
// ✅ FIX: was POST — frontend calls PUT
router.put("/:notificationId/read", markAsRead);

// DELETE /api/notifications/:notificationId - Delete notification
router.delete("/:notificationId", deleteNotification);

export default router;
