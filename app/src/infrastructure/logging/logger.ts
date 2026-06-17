import { eventBus, Events, type PrintEvent } from "@/shared/events";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIX = "[SAE]";

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `${timestamp} ${LOG_PREFIX}[${level.toUpperCase()}] ${message}`;
}

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(formatMessage("debug", message, data), data ?? "");
    }
  },

  info: (message: string, data?: unknown) => {
    console.info(formatMessage("info", message, data), data ?? "");
  },

  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage("warn", message, data), data ?? "");
  },

  error: (message: string, error?: unknown) => {
    console.error(formatMessage("error", message, error), error ?? "");
  },

  api: {
    request: (method: string, url: string) => {
      logger.debug(`API ${method} ${url}`);
    },
    response: (method: string, url: string, status: number, durationMs: number) => {
      const emoji = status < 400 ? "✓" : "✗";
      logger.debug(`API ${emoji} ${method} ${url} → ${status} (${durationMs}ms)`);
    },
    error: (method: string, url: string, error: unknown) => {
      logger.error(`API ✗ ${method} ${url}`, error);
    },
  },
};
