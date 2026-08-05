import { Response } from "express";

/**
 * Standard API response envelope (Session 1 — R-36).
 *
 * Every response the platform sends is one of two shapes:
 *   success → { success: true,  data:  <payload> }
 *   error   → { success: false, error: { code, message, details? } }
 *
 * Success responses go through `sendSuccess`; errors are emitted centrally by
 * `errorHandler` (which uses `sendError`). Feature slices adopt this contract
 * incrementally — the auth slice is the first (Session 1); the rest follow in
 * S2–S6. Keeping the shape in one place means the frontend can normalise once.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

/** Send a success envelope: 2xx with { success:true, data }. */
export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

/** Send an error envelope: { success:false, error:{ code, message, details? } }. */
export function sendError(
  res: Response,
  opts: { code: string; message: string; status?: number; details?: unknown }
): Response {
  const { code, message, status = 500, details } = opts;
  const error: ApiError = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
}
