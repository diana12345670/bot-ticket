const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

type LogLevel = "info" | "success" | "warn" | "error" | "debug" | "trace" | "critical";
type LogSource = "server" | "discord" | "database" | "api" | "ai" | "error" | "startup" | "shutdown";

const levelConfig: Record<LogLevel, { color: string; icon: string; label: string }> = {
  info: { color: colors.blue, icon: "●", label: "INFO" },
  success: { color: colors.green, icon: "✓", label: "OK" },
  warn: { color: colors.yellow, icon: "!", label: "WARN" },
  error: { color: colors.red, icon: "✕", label: "ERROR" },
  debug: { color: colors.gray, icon: "○", label: "DEBUG" },
  trace: { color: colors.dim, icon: "·", label: "TRACE" },
  critical: { color: colors.bright + colors.red, icon: "⚠", label: "CRITICAL" },
};

const sourceConfig: Record<LogSource, { color: string; label: string }> = {
  server: { color: colors.cyan, label: "SERVER" },
  discord: { color: colors.magenta, label: "DISCORD" },
  database: { color: colors.yellow, label: "DB" },
  api: { color: colors.blue, label: "API" },
  ai: { color: colors.green, label: "AI" },
  error: { color: colors.red, label: "ERROR" },
  startup: { color: colors.bright + colors.cyan, label: "STARTUP" },
  shutdown: { color: colors.bright + colors.yellow, label: "SHUTDOWN" },
};

function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatMessage(
  level: LogLevel,
  source: LogSource,
  message: string,
  details?: Record<string, any>
): string {
  const levelCfg = levelConfig[level];
  const sourceCfg = sourceConfig[source];
  const timestamp = getTimestamp();

  let output = `${colors.gray}${timestamp}${colors.reset} `;
  output += `${levelCfg.color}${levelCfg.icon}${colors.reset} `;
  output += `${sourceCfg.color}[${sourceCfg.label}]${colors.reset} `;
  output += message;

  if (details && Object.keys(details).length > 0) {
    const detailsStr = Object.entries(details)
      .map(([key, value]) => `${colors.dim}${key}=${colors.reset}${value}`)
      .join(" ");
    output += ` ${colors.gray}|${colors.reset} ${detailsStr}`;
  }

  return output;
}

class Logger {
  private source: LogSource;

  constructor(source: LogSource) {
    this.source = source;
  }

  info(message: string, details?: Record<string, any>) {
    console.log(formatMessage("info", this.source, message, details));
  }

  success(message: string, details?: Record<string, any>) {
    console.log(formatMessage("success", this.source, message, details));
  }

  warn(message: string, details?: Record<string, any>) {
    console.warn(formatMessage("warn", this.source, message, details));
  }

  error(message: string, details?: Record<string, any>) {
    console.error(formatMessage("error", this.source, message, details));
  }

  critical(message: string, details?: Record<string, any>) {
    console.error(formatMessage("critical", this.source, message, details));
  }

  debug(message: string, details?: Record<string, any>) {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG_MODE === "true") {
      console.log(formatMessage("debug", this.source, message, details));
    }
  }

  trace(message: string, details?: Record<string, any>) {
    if (process.env.DEBUG_MODE === "true") {
      console.log(formatMessage("trace", this.source, message, details));
    }
  }

  request(method: string, path: string, status: number, duration: number, body?: any) {
    const statusColor = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
    const details: Record<string, any> = {
      status: `${statusColor}${status}${colors.reset}`,
      time: `${duration}ms`,
    };
    
    if (body && typeof body === "object") {
      const bodyStr = JSON.stringify(body);
      if (bodyStr.length <= 100) {
        details.response = bodyStr;
      }
    }

    console.log(formatMessage("info", "api", `${method} ${path}`, details));
  }

  startupPhase(phase: string, details?: Record<string, any>) {
    console.log(formatMessage("info", "startup", `→ ${phase}`, details));
  }

  shutdownPhase(phase: string, details?: Record<string, any>) {
    console.log(formatMessage("warn", "shutdown", `← ${phase}`, details));
  }
}

export const serverLogger = new Logger("server");
export const discordLogger = new Logger("discord");
export const dbLogger = new Logger("database");
export const apiLogger = new Logger("api");
export const aiLogger = new Logger("ai");
export const errorLogger = new Logger("error");

export function createLogger(source: LogSource): Logger {
  return new Logger(source);
}

// Global error handlers
if (typeof process !== "undefined" && process.on) {
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    errorLogger.critical("Unhandled Promise Rejection", {
      reason: reason?.message || String(reason),
      promise: String(promise),
      stack: reason?.stack,
    });
  });

  process.on("uncaughtException", (error: Error) => {
    errorLogger.critical("Uncaught Exception", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    serverLogger.shutdownPhase("SIGTERM received, graceful shutdown initiated");
  });

  process.on("SIGINT", () => {
    serverLogger.shutdownPhase("SIGINT received, graceful shutdown initiated");
  });
}
