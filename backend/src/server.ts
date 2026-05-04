import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./configs/db";
import { logger } from "./utils/logger";
import app from "./app";
import env from "./configs/env";
import { configureGracefulShutdown } from "./utils/shutdown";
import { initializeSockets } from "./sockets";

/**
 * 🚀 INTELLMEET SERVER INITIALIZATION
 * This file handles the HTTP server, Socket.io, and Database connection.
 */
console.log("🔥 [system]: Starting IntellMeet Backend...");

const port = env.PORT || 3001;

// 1. Create the HTTP Server
// Wrapping Express in 'http' is required for Socket.io to share the same port.
const httpServer = http.createServer(app);

// 2. Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// 3. Attach WebRTC Signaling Logic
initializeSockets(io);

// 4. Connect to Database & Start Server
connectDB()
  .then(() => {
    const server = httpServer.listen(port, () => {
      logger.info(`🚀 [server]: Server is running at http://localhost:${port}`);
      logger.info(`📡 [socket]: WebRTC signaling hub is active`);
    });

    // --- PERMANENT PORT RELEASE HANDLERS ---
    
    // Handle Nodemon Restarts (SIGUSR2)
    // This allows the port to be released BEFORE the new process starts.
    process.once("SIGUSR2", () => {
      server.close(() => {
        logger.info("♻️ [server]: Releasing port for Nodemon restart...");
        process.kill(process.pid, "SIGUSR2");
      });
    });

    // Handle Manual Shutdown (CTRL+C)
    process.on("SIGINT", () => {
      server.close(() => {
        logger.info("🛑 [server]: Manual shutdown. Port cleared.");
        process.exit(0);
      });
    });

    // Handle Unexpected Termination
    process.on("SIGTERM", () => {
      server.close(() => {
        process.exit(0);
      });
    });

    // Handle Server Runtime Errors
    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`❌ [critical]: Port ${port} is blocked.`);
        process.exit(1);
      } else {
        logger.error("❌ [error]:", error);
      }
    });

    // 5. Graceful Shutdown Utility (for logs/db cleanup)
    configureGracefulShutdown(server);
  })
  .catch((error) => {
    logger.error("❌ [database]: Connection failed:", error);
    process.exit(1);
  });