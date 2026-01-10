const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",
  
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  orange: "\x1b[38;5;208m",
  purple: "\x1b[38;5;141m",
  pink: "\x1b[38;5;213m",
};

type LogLevel = "info" | "success" | "warn" | "error" | "debug" | "panel" | "ticket" | "command";
type LogSource = "server" | "discord" | "database" | "api" | "ai" | "panel" | "ticket" | "command";

const levelConfig: Record<LogLevel, { color: string; icon: string; label: string }> = {
  info: { color: colors.blue, icon: "●", label: "INFO" },
  success: { color: colors.green, icon: "✓", label: "OK" },
  warn: { color: colors.yellow, icon: "!", label: "WARN" },
  error: { color: colors.red, icon: "✕", label: "ERROR" },
  debug: { color: colors.gray, icon: "○", label: "DEBUG" },
  panel: { color: colors.purple, icon: "⚙", label: "PANEL" },
  ticket: { color: colors.orange, icon: "🎫", label: "TICKET" },
  command: { color: colors.cyan, icon: "⚡", label: "CMD" },
};

const sourceConfig: Record<LogSource, { color: string; label: string }> = {
  server: { color: colors.cyan, label: "SERVER" },
  discord: { color: colors.magenta, label: "DISCORD" },
  database: { color: colors.yellow, label: "DB" },
  api: { color: colors.blue, label: "API" },
  ai: { color: colors.green, label: "AI" },
  panel: { color: colors.purple, label: "PANEL" },
  ticket: { color: colors.orange, label: "TICKET" },
  command: { color: colors.cyan, label: "COMMAND" },
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
  output += `${colors.white}${message}${colors.reset}`;

  if (details && Object.keys(details).length > 0) {
    output += `\n${colors.dim}└─ Details:${colors.reset}`;
    Object.entries(details).forEach(([key, value]) => {
      const formattedValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      const lines = formattedValue.split('\n');
      lines.forEach((line, index) => {
        const prefix = index === 0 ? `   ${colors.cyan}${key}:${colors.reset}` : '      ';
        output += `\n${prefix} ${colors.dim}${line}${colors.reset}`;
      });
    });
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

  debug(message: string, details?: Record<string, any>) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === "development") {
      console.log(formatMessage("debug", this.source, message, details));
    }
  }

  panel(message: string, details?: Record<string, any>) {
    console.log(formatMessage("panel", this.source, message, details));
  }

  ticket(message: string, details?: Record<string, any>) {
    console.log(formatMessage("ticket", this.source, message, details));
  }

  command(message: string, details?: Record<string, any>) {
    console.log(formatMessage("command", this.source, message, details));
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

  // Métodos especiais para eventos importantes
  startup(service: string, details?: Record<string, any>) {
    console.log(`\n${colors.bright}${colors.cyan}🚀 Starting ${service}...${colors.reset}`);
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`   ${colors.dim}${key}:${colors.reset} ${colors.white}${value}${colors.reset}`);
      });
    }
    console.log(`${colors.bright}${colors.green}✅ ${service} started successfully!${colors.reset}\n`);
  }

  interaction(type: string, user: string, action: string, details?: Record<string, any>) {
    const message = `${colors.cyan}${user}${colors.reset} ${colors.white}${action}${colors.reset}`;
    const logDetails = { type, user, ...details };
    console.log(formatMessage("command", "discord", message, logDetails));
  }
}

export const serverLogger = new Logger("server");
export const discordLogger = new Logger("discord");
export const dbLogger = new Logger("database");
export const apiLogger = new Logger("api");
export const aiLogger = new Logger("ai");
export const panelLogger = new Logger("panel");
export const ticketLogger = new Logger("ticket");
export const commandLogger = new Logger("command");

export function createLogger(source: LogSource): Logger {
  return new Logger(source);
}
