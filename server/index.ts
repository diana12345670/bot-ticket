import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { discordBot } from "./discord-bot";
import { serverLogger, apiLogger, startupLogger } from "./logger";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

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

// Health check endpoints (must be before async block to respond immediately)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/ping", (_req, res) => {
  res.status(200).json({ pong: true });
});

const port = parseInt(process.env.PORT || "5000", 10);

// Start server FIRST (non-blocking)
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    console.log(`\n✅ HTTP Server listening on port ${port}`);
  }
);

// Initialize everything else in background (non-blocking)
(async () => {
  try {
    startupLogger.header("🎵 Ticket Bot Startup");

    // Initialize routes
    serverLogger.info("🔄 Registrando rotas da API...");
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    // Setup frontend or Vite
    if (process.env.NODE_ENV === "production") {
      serverLogger.info("🔄 Servindo arquivos estáticos...");
      serveStatic(app);
    } else {
      serverLogger.info("🔄 Configurando Vite dev server...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    serverLogger.success(`🌐 Servidor rodando na porta ${port}`);
    serverLogger.info(`📊 Dashboard: http://localhost:${port}`);
    serverLogger.info(`🏥 Health: http://localhost:${port}/health`);
    serverLogger.divider();

    // Start Discord bot in background (non-blocking)
    startupLogger.info("🔄 Inicializando Discord Bot...");
    discordBot
      .start()
      .then(() => {
        serverLogger.success("✅ Discord bot conectado com sucesso!");
      })
      .catch((error) => {
        serverLogger.error("Failed to start Discord bot", {
          error: error.message,
        });
      });
  } catch (error: any) {
    serverLogger.error("Startup error", { error: error.message, stack: error.stack });
    process.exit(1);
  }
})();
