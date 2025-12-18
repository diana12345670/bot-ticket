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

type LogLevel = "info" | "success" | "warn" | "error" | "debug" | "section";
type LogSource =
  | "server"
  | "discord"
  | "database"
  | "api"
  | "ai"
  | "bot"
  | "startup";

const levelConfig: Record<
  LogLevel,
  { color: string; icon: string; label: string }
> = {
  info: { color: colors.blue, icon: "ℹ", label: "INFO" },
  success: { color: colors.green, icon: "✅", label: "OK" },
  warn: { color: colors.yellow, icon: "⚠", label: "WARN" },
  error: { color: colors.red, icon: "❌", label: "ERROR" },
  debug: { color: colors.gray, icon: "🔍", label: "DEBUG" },
  section: { color: colors.cyan, icon: "", label: "" },
};

const sourceConfig: Record<LogSource, { color: string; icon: string }> = {
  server: { color: colors.cyan, icon: "🌐" },
  discord: { color: colors.magenta, icon: "👾" },
  database: { color: colors.yellow, icon: "💾" },
  api: { color: colors.blue, icon: "📡" },
  ai: { color: colors.green, icon: "🤖" },
  bot: { color: colors.magenta, icon: "🎵" },
  startup: { color: colors.cyan, icon: "⚡" },
};

function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const ms = now.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${ms}`;
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

  let output = `${colors.gray}[${timestamp}]${colors.reset} `;
  output += levelCfg.icon ? `${levelCfg.icon} ` : "";

  if (source !== "startup") {
    output += `${sourceCfg.icon} `;
  }

  output += `${colors.bright}${message}${colors.reset}`;

  if (details && Object.keys(details).length > 0) {
    const detailsStr = Object.entries(details)
      .map(([key, value]) => {
        const coloredKey = `${colors.cyan}${key}${colors.reset}`;
        return `${coloredKey}: ${colors.dim}${value}${colors.reset}`;
      })
      .join(` ${colors.gray}|${colors.reset} `);
    output += ` ${colors.gray}│${colors.reset} ${detailsStr}`;
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
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.log(formatMessage("debug", this.source, message, details));
    }
  }

  section(title: string) {
    const line = "━".repeat(40);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  }

  divider() {
    console.log(
      `${colors.gray}${"─".repeat(50)}${colors.reset}`
    );
  }

  header(title: string) {
    const padding = Math.max(0, (50 - title.length) / 2);
    const paddingStr = " ".repeat(Math.floor(padding));
    console.log(
      `\n${colors.bright}${colors.cyan}${"━".repeat(50)}${colors.reset}`
    );
    console.log(
      `${colors.bright}${colors.cyan}${paddingStr}${title}${colors.reset}`
    );
    console.log(
      `${colors.bright}${colors.cyan}${"━".repeat(50)}${colors.reset}\n`
    );
  }

  request(
    method: string,
    path: string,
    status: number,
    duration: number,
    body?: any
  ) {
    const statusColor =
      status >= 400
        ? colors.red
        : status >= 300
          ? colors.yellow
          : colors.green;
    const details: Record<string, any> = {
      status: `${statusColor}${status}${colors.reset}`,
      time: `${colors.yellow}${duration}ms${colors.reset}`,
    };

    if (body && typeof body === "object") {
      const bodyStr = JSON.stringify(body);
      if (bodyStr.length <= 100) {
        details.response = bodyStr;
      }
    }

    console.log(
      formatMessage("info", "api", `${colors.bright}${method}${colors.reset} ${path}`, details)
    );
  }

  botStatus(botName: string, status: {
    username?: string;
    tag?: string;
    guilds?: number;
    users?: number;
    ping?: number;
    applicationId?: string;
  }) {
    console.log(
      `${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    console.log(
      `${colors.green}✅${colors.reset} ${colors.bright}[${botName}]${colors.reset} ${colors.green}Online${colors.reset} como ${colors.bright}${status.tag || status.username}${colors.reset}`
    );
    
    if (status.applicationId) {
      console.log(
        `${colors.blue}📱${colors.reset} ${colors.dim}Application ID:${colors.reset} ${status.applicationId}`
      );
    }

    if (status.guilds !== undefined) {
      console.log(
        `${colors.magenta}📊${colors.reset} ${colors.dim}Servidores:${colors.reset} ${colors.bright}${status.guilds}${colors.reset}`
      );
    }

    if (status.users !== undefined) {
      console.log(
        `${colors.cyan}👥${colors.reset} ${colors.dim}Usuários:${colors.reset} ${colors.bright}${status.users}${colors.reset}`
      );
    }

    if (status.ping !== undefined) {
      console.log(
        `${colors.yellow}🏓${colors.reset} ${colors.dim}Ping:${colors.reset} ${colors.bright}${status.ping}ms${colors.reset}`
      );
    }

    console.log(
      `${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
  }

  commandRegistered(commandName: string) {
    console.log(
      `${colors.green}✅${colors.reset} Comando carregado: ${colors.bright}${commandName}${colors.reset}`
    );
  }

  commandsTotal(total: number) {
    console.log(
      `${colors.magenta}📦${colors.reset} Total de comandos carregados: ${colors.bright}${total}${colors.reset}`
    );
  }
}

export const serverLogger = new Logger("server");
export const discordLogger = new Logger("discord");
export const dbLogger = new Logger("database");
export const apiLogger = new Logger("api");
export const aiLogger = new Logger("ai");
export const botLogger = new Logger("bot");
export const startupLogger = new Logger("startup");

export function createLogger(source: LogSource): Logger {
  return new Logger(source);
}
