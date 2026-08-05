import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/httpErrors";
import { sendError } from "../utils/apiResponse";
import logger from "../lib/logger";

/**
 * Central error handler (Session 1 — R-36). This is the terminal middleware in
 * app.ts, so ANY error thrown/next()'d from the request path — including async
 * rejections, which Express 5 forwards here automatically — lands here and is
 * turned into the standard error envelope:
 *
 *   { success: false, error: { code, message, details? } }
 *
 * It never leaks a stack trace or file path in production: only expected
 * (operational) AppErrors surface their own message; everything else collapses
 * to a generic 500. Full detail is attached under `details.debug` ONLY when
 * NODE_ENV !== 'production', so local debugging still gets the stack.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If headers already went out (e.g. an error mid-stream), we can't rewrite the
  // response — hand off to Express's default finaliser to close the socket.
  if (res.headersSent) return next(err);

  // Fail SAFE: expose stack/internal detail ONLY when explicitly in development.
  // A prod (or staging, or NODE_ENV-unset) deploy must never leak a stack trace,
  // so anything that isn't the literal "development" is treated as production.
  const isProd = process.env.NODE_ENV !== "development";
  const { status, code, message, details } = classify(err, isProd);

  // Log every handled error at error level (structured — pino when available,
  // console fallback otherwise). 5xx get the stack; 4xx are expected, keep quiet.
  const logPayload = {
    method: req.method,
    path: req.originalUrl || req.url,
    status,
    code,
    msg: err?.message,
    ...(status >= 500 ? { stack: err?.stack } : {}),
  };
  if (status >= 500) logger.error(logPayload, "request failed");
  else logger.warn(logPayload, "request rejected");

  return sendError(res, { code, message, status, details });
};

/**
 * 404 handler — mounted right before `errorHandler`, after every route. Any
 * request that matched no route gets the standard envelope instead of Express's
 * default HTML page.
 */
export const notFoundHandler = (req: Request, res: Response) => {
  return sendError(res, {
    code: "NOT_FOUND",
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
    status: 404,
  });
};

/** Map a thrown value to a safe { status, code, message, details }. */
function classify(
  err: any,
  isProd: boolean
): { status: number; code: string; message: string; details?: unknown } {
  const debug = isProd ? undefined : { debug: err?.stack || String(err) };

  // 1. Our own typed errors — trusted status/code/message.
  if (err instanceof AppError) {
    // A non-operational AppError (e.g. InternalError) hides its message in prod.
    const message =
      err.isOperational || !isProd ? err.message : "Internal Server Error";
    const details = mergeDetails(err.details, debug);
    return { status: err.statusCode, code: err.code, message, details };
  }

  // 2. Body-parser oversized payload → 413 (folded in from app.ts).
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Payload too large" };
  }

  // 3. Prisma known request errors — minimal high-value mapping (rest → 500).
  //    Matched by shape (code string like 'P2025') to avoid importing the
  //    Prisma runtime here.
  if (typeof err?.code === "string" && /^P\d{4}$/.test(err.code)) {
    if (err.code === "P2025") {
      return { status: 404, code: "NOT_FOUND", message: "Resource not found", details: debug };
    }
    if (err.code === "P2002") {
      return { status: 409, code: "CONFLICT", message: "Resource already exists", details: debug };
    }
  }

  // 4. A plain error carrying an explicit HTTP status (legacy `err.status`).
  const legacyStatus = Number(err?.status || err?.statusCode);
  if (Number.isInteger(legacyStatus) && legacyStatus >= 400 && legacyStatus < 600) {
    const message = legacyStatus < 500 || !isProd ? String(err?.message || "Error") : "Internal Server Error";
    return { status: legacyStatus, code: legacyStatus >= 500 ? "INTERNAL" : "ERROR", message, details: debug };
  }

  // 5. Anything else — unknown/programming error. Never surface it in prod.
  return {
    status: 500,
    code: "INTERNAL",
    message: isProd ? "Internal Server Error" : String(err?.message || err),
    details: debug,
  };
}

/** Combine an AppError's own details with the dev-only debug field, if any. */
function mergeDetails(own: unknown, debug: { debug: string } | undefined): unknown {
  if (own === undefined) return debug;
  if (debug === undefined) return own;
  if (own && typeof own === "object" && !Array.isArray(own)) {
    return { ...(own as Record<string, unknown>), ...debug };
  }
  return { value: own, ...debug };
}
