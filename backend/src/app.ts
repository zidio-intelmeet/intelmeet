import express, { Express, Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { errorHandler } from "./middlewares/error-handler";
import { setupSwagger } from "./configs/swagger";
import healthRoutes from "./routes/health.routes";
import { apiRateLimiter } from "./middlewares/rate-limiter";
import { attachTenantContext } from "./middlewares/tenant.middleware";
import authRoutes from "./routes/auth.routes";
import meetingRoutes from "./routes/meeting.routes";
import aiRoutes from "./routes/ai.routes";
import transcriptRoutes from "./routes/transcript.routes";
import taskRoutes from "./routes/task.routes";
import notificationRoutes from "./routes/notification.routes";
import organizationRoutes from "./routes/organization.routes";
import invitationRoutes from "./routes/invitation.routes"; 
import passwordRoutes from "./routes/password.routes";
import sourceMapSupport from "source-map-support";
sourceMapSupport.install();
import env from "./configs/env";
import { logger } from "./utils/logger";

const app: Express = express();

// 🚀 SECURITY FIX: Gate trust proxy behind environment/config to prevent IP spoofing
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚀 SECURITY FIX: Explicit origin validation for credentials: true
const allowedOrigins = [env.CORS_ORIGIN || "http://localhost:5173"];
if (process.env.NODE_ENV === "development" && process.env.NGROK_URL) {
    allowedOrigins.push(process.env.NGROK_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Tenant-ID",
      "X-Tenant-Slug",
      "Accept",
      // Include Ngrok bypass headers to prevent preflight failures in dev
      "x-tunnel-skip-antiphishing-page",
      "ngrok-skip-browser-warning"
    ],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

app.use(attachTenantContext);
setupSwagger(app);

app.get("/", (req: Request, res: Response) => {
  res.redirect("/api/v1/health");
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1", apiRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/transcripts", transcriptRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invitations", invitationRoutes); 
app.use("/api/auth", passwordRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;