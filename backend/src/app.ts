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
// import orgRoutes from "./routes/org.routes";
import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import env from "./configs/env";

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Tenant-ID", "X-Tenant-Slug"],
    credentials: true
  })
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// Apply tenant context middleware globally
app.use(attachTenantContext);

//? Swagger Setup
setupSwagger(app);

//? Routes
app.get("/", (req: Request, res: Response) => {
  res.redirect("/api/v1/health");
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1", apiRateLimiter);
app.use("/api/auth", authRoutes);
// app.use("/api/orgs", orgRoutes);

// Not found handler (should be after routes)
app.use(notFoundHandler);

// Global error handler (should be last)
app.use(errorHandler);

export default app;
