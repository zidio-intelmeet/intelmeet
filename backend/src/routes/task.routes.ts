import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { apiRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

// Apply auth and rate limiting
router.use(requireAuth);
router.use(apiRateLimiter);

// GET /api/tasks/meeting/:meetingId - Get all tasks for a meeting
router.get("/meeting/:meetingId", getTasks);

// GET /api/tasks - Get all tasks for the tenant
router.get("/", getTasks);

// GET /api/tasks/:taskId - Get single task
router.get("/:taskId", getTaskById);

// POST /api/tasks - Create task
router.post("/", createTask);

// PUT /api/tasks/:taskId - Update task
router.put("/:taskId", updateTask);

// DELETE /api/tasks/:taskId - Delete task
router.delete("/:taskId", deleteTask);

export default router;
