import { logger } from "@/infrastructure/logging";
import { getToken, getApiBaseUrl } from "@/infrastructure/auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
  skipContentType?: boolean;
};

export type ApiError = Error & {
  status?: number;
  data?: unknown;
};

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

function shouldRetry(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || (status >= 500 && status !== 501);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(error: unknown, status?: number, data?: unknown): ApiError {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    apiError.status = status;
    apiError.data = data;
    return apiError;
  }

  if (typeof error === "string") {
    const messageLine = error
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    const explicitMessage = error.match(/Mensaje\s*=\s*(.+)/i)?.[1]?.trim();
    if (explicitMessage) {
      const err = new Error(explicitMessage) as ApiError;
      err.status = status;
      err.data = data;
      return err;
    }

    const dotnetException = error.match(/System\.[\w.]+:\s*([^\r\n]+)/)?.[1]?.trim();
    if (dotnetException) {
      const err = new Error(dotnetException) as ApiError;
      err.status = status;
      err.data = data;
      return err;
    }

    const err = new Error(messageLine || "Error desconocido") as ApiError;
    err.status = status;
    err.data = data;
    return err;
  }

  const err = new Error("Error desconocido") as ApiError;
  err.status = status;
  err.data = data;
  return err;
}

function getHumanReadableStatus(status: number): string {
  const messages: Record<number, string> = {
    400: "Solicitud incorrecta",
    401: "Sesión expirada",
    403: "No tiene permisos para realizar esta acción",
    404: "Recurso no encontrado",
    500: "Error interno del servidor",
    502: "Servidor no disponible",
    503: "Servicio en mantenimiento",
  };
  return messages[status] ?? `Error del servidor (${status})`;
}

export async function httpRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    skipAuth = false,
    skipContentType = false,
  } = options;

  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const startTime = performance.now();

  if (import.meta.env.DEV) {
    logger.api.request(method, url);
  }

  const requestHeaders: Record<string, string> = { ...headers };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  if (!skipContentType && body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Math.round(performance.now() - startTime);
      const contentType = response.headers.get("content-type") ?? "";
      const bodyText = await response.text();

      if (import.meta.env.DEV) {
        logger.api.response(method, path, response.status, durationMs);
      }

      if (!response.ok) {
        if (shouldRetry(response.status) && attempt <= retries) {
          const backoff = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          if (import.meta.env.DEV) {
            logger.debug(`Retry ${attempt}/${retries} for ${method} ${path} (waiting ${backoff}ms)`);
          }
          await delay(backoff);
          continue;
        }

        let parsedBody: unknown = bodyText;
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          // body is not JSON
        }

        const message = typeof parsedBody === "object" && parsedBody !== null
          ? (parsedBody as Record<string, unknown>).mensaje
            || (parsedBody as Record<string, unknown>).message
            || (parsedBody as Record<string, unknown>).title
            || (parsedBody as Record<string, unknown>).Mensaje
            || getHumanReadableStatus(response.status)
          : bodyText || getHumanReadableStatus(response.status);

        throw normalizeError(message, response.status, parsedBody);
      }

      if (!bodyText) return undefined as T;
      if (contentType.includes("application/json")) return JSON.parse(bodyText) as T;
      return bodyText as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new Error(`Tiempo de espera excedido (${timeoutMs} ms)`);
        if (attempt <= retries) {
          await delay(RETRY_BASE_DELAY * Math.pow(2, attempt - 1));
          continue;
        }
        throw normalizeError(lastError);
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        lastError = error;
        if (attempt <= retries) {
          const backoff = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          await delay(backoff);
          continue;
        }
      }

      throw normalizeError(error);
    }
  }

  throw normalizeError(lastError);
}

export const http = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    httpRequest<T>(path, { ...opts, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    httpRequest<T>(path, { ...opts, method: "POST", body }),

  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    httpRequest<T>(path, { ...opts, method: "PUT", body }),

  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    httpRequest<T>(path, { ...opts, method: "PATCH", body }),

  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    httpRequest<T>(path, { ...opts, method: "DELETE", ...opts }),
};
