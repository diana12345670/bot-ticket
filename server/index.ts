import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { discordBot } from "./discord-bot";
import { serverLogger, apiLogger, dbLogger } from "./logger";
import { initializeDatabase, testDatabaseConnection } from "./db-init";
import { errorHandler } from "./error-handler";
import { requestIdMiddleware, healthCheckMiddleware, requestTimeoutMiddleware } from "./middleware";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Request tracking
app.use(requestIdMiddleware);
app.use(healthCheckMiddleware);
app.use(requestTimeoutMiddleware(30000));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      apiLogger.request(req.method, path, res.statusCode, duration, capturedJsonResponse);
    }
  });

  next();
});

(async () => {
  serverLogger.info("Application startup initiated");

  // Initialize database before starting the bot - CRITICAL
  let dbReady = false;
  try {
    serverLogger.info("Testing database connection...");
    const dbConnected = await testDatabaseConnection();
    
    if (dbConnected) {
      serverLogger.info("Initializing database schema...");
      dbReady = await initializeDatabase();
      
      if (!dbReady) {
        dbLogger.error("CRITICAL: Database initialization FAILED - tables not created!");
        serverLogger.error("Database initialization failed - cannot start bot safely");
        process.exit(1); // Exit if DB not ready
      } else {
        serverLogger.success("Database initialization successful - all tables ready");
      }
    } else {
      dbLogger.error("CRITICAL: Database connection failed - cannot proceed!");
      serverLogger.error("Database connection failed - cannot start bot");
      process.exit(1); // Exit if can't connect
    }
  } catch (error: any) {
    dbLogger.error("Database initialization error", { error: error.message });
    serverLogger.error("Fatal database initialization error");
    process.exit(1); // Exit on any error
  }

  try {
    await registerRoutes(httpServer, app);
  } catch (error: any) {
    serverLogger.error("Failed to register routes", { error: error.message });
    process.exit(1);
  }

  // Global error handler (must be last)
  app.use(errorHandler);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    } catch (error: any) {
      serverLogger.warn("Vite setup failed in development", { error: error.message });
    }
  }

  const port = parseInt(process.env.PORT || "8080", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      serverLogger.success(`Server running on port ${port}`);
    },
  );

  // Start Discord bot with proper error handling
  try {
    serverLogger.info("Starting Discord bot...");
    await discordBot.start();
    serverLogger.success("Discord bot initialized");
  } catch (error: any) {
    serverLogger.error("Failed to start Discord bot", { error: error.message });
    // Don't exit - allow server to run even if bot fails
  }
})().catch((error) => {
  serverLogger.error("Fatal application startup error", { error: error.message });
  process.exit(1);
});
