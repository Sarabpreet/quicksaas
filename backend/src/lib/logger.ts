import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, "../..");
export const LOG_DIR = process.env.LOG_DIR || path.resolve(backendRoot, ".data", "logs");

// ANSI color codes for terminal formatting
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

function ensureLogDirectory(): void {
  if (!fs.existsSync(LOG_DIR)) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch {}
  }
}

function writeToFile(filename: string, line: string): void {
  ensureLogDirectory();
  try {
    fs.appendFileSync(path.join(LOG_DIR, filename), line + "\n", "utf8");
  } catch {}
}

function getFormattedTime(): string {
  const now = new Date();
  return now.toTimeString().split(" ")[0]; // "HH:MM:SS"
}

function colorizeMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return `${colors.cyan}${method.padEnd(6)}${colors.reset}`;
    case "POST":
      return `${colors.green}${method.padEnd(6)}${colors.reset}`;
    case "PUT":
    case "PATCH":
      return `${colors.yellow}${method.padEnd(6)}${colors.reset}`;
    case "DELETE":
      return `${colors.red}${method.padEnd(6)}${colors.reset}`;
    default:
      return `${colors.dim}${method.padEnd(6)}${colors.reset}`;
  }
}

function colorizeStatus(status: number): string {
  if (status >= 500) {
    return `${colors.red}${colors.bold}${status}${colors.reset}`;
  }
  if (status >= 400) {
    return `${colors.yellow}${status}${colors.reset}`;
  }
  if (status >= 300) {
    return `${colors.cyan}${status}${colors.reset}`;
  }
  return `${colors.green}${status}${colors.reset}`;
}

export const logger = {
  info(message: string, meta?: any): void {
    const time = getFormattedTime();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    if (process.env.NODE_ENV !== "test") {
      console.log(`${colors.dim}[${time}]${colors.reset} ${colors.blue}INFO${colors.reset}  ${message}${metaStr}`);
    }
    writeToFile("app.log", `[${new Date().toISOString()}] INFO: ${message}${metaStr}`);
  },

  warn(message: string, meta?: any): void {
    const time = getFormattedTime();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.warn(`${colors.dim}[${time}]${colors.reset} ${colors.yellow}WARN${colors.reset}  ${message}${metaStr}`);
    writeToFile("app.log", `[${new Date().toISOString()}] WARN: ${message}${metaStr}`);
  },

  error(message: string, error?: any, meta?: any): void {
    const time = getFormattedTime();
    const errStack = error?.stack || error?.message || (error ? String(error) : "");
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";

    console.error(
      `${colors.dim}[${time}]${colors.reset} ${colors.red}${colors.bold}ERROR${colors.reset} ${message}${metaStr}`
    );
    if (errStack && process.env.NODE_ENV !== "test") {
      console.error(`${colors.dim}${errStack}${colors.reset}`);
    }

    const fileContent = `[${new Date().toISOString()}] ERROR: ${message}${metaStr}\n${errStack}`;
    writeToFile("app.log", fileContent);
    writeToFile("error.log", fileContent);
  },

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return;
    const time = getFormattedTime();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.log(`${colors.dim}[${time}] DEBUG ${message}${metaStr}${colors.reset}`);
  },

  http(method: string, url: string, statusCode: number, durationMs: number, extra?: string): void {
    const time = getFormattedTime();
    const durationFormatted = durationMs < 1 ? "<1ms" : `${durationMs.toFixed(1)}ms`;
    const extraStr = extra ? ` ${colors.dim}- ${extra}${colors.reset}` : "";

    // In test environment, keep quiet on 2xx/3xx/4xx to prevent cluttering test output
    if (process.env.NODE_ENV !== "test" || statusCode >= 500) {
      console.log(
        `${colors.dim}[${time}]${colors.reset} ${colorizeMethod(method)} ${url} ${colorizeStatus(statusCode)} ${colors.dim}(${durationFormatted})${colors.reset}${extraStr}`
      );
    }

    // Persist all HTTP requests to .data/logs/app.log
    writeToFile(
      "app.log",
      `[${new Date().toISOString()}] HTTP: ${method} ${url} ${statusCode} (${durationFormatted})${extra ? ` - ${extra}` : ""}`
    );

    // If 5xx, also log to error.log
    if (statusCode >= 500) {
      writeToFile(
        "error.log",
        `[${new Date().toISOString()}] HTTP_5XX: ${method} ${url} ${statusCode} (${durationFormatted})${extra ? ` - ${extra}` : ""}`
      );
    }
  },

  /**
   * Reads recent log lines from project log files
   */
  async getRecentLogs(type: "app" | "error" = "app", maxLines = 100): Promise<string[]> {
    ensureLogDirectory();
    const filename = type === "error" ? "error.log" : "app.log";
    const filePath = path.join(LOG_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      return lines.slice(-maxLines);
    } catch {
      return [];
    }
  },
};

/**
 * Attaches compact, high-visibility single-line HTTP logging to Fastify
 */
export function attachCompactLogger(app: FastifyInstance): void {
  // Record start timestamp on each request
  app.addHook("onRequest", async (request: FastifyRequest) => {
    (request as any).__startTime = process.hrtime.bigint();
  });

  // Log clean single line on response completion
  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime: bigint | undefined = (request as any).__startTime;
    let durationMs = 0;
    if (startTime) {
      const elapsedNs = process.hrtime.bigint() - startTime;
      durationMs = Number(elapsedNs) / 1e6;
    }

    // Identify user/tenant actor if authenticated
    let actorHint = "";
    if ((request as any).user?.email) {
      actorHint = (request as any).user.email;
    } else if ((request as any).apiKey) {
      actorHint = `key:${(request as any).apiKey.keyPrefix}`;
    }

    logger.http(request.method, request.url, reply.statusCode, durationMs, actorHint);
  });
}
