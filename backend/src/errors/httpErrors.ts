/**
 * Typed HTTP error classes (Session 1 — error/envelope backbone, R-36).
 *
 * Throwing one of these from anywhere in the request path lets the central
 * `errorHandler` middleware turn it into the standard error envelope
 * ({ success:false, error:{ code, message, details? } }) with the right status —
 * instead of every controller hand-rolling `res.status(x).json({ error })`.
 *
 * `isOperational` marks an *expected* error (bad input, missing row, auth) as
 * opposed to a programming/unknown crash. The handler uses it to decide whether
 * the message is safe to surface verbatim.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL",
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    // Restore prototype chain (needed when targeting ES5/commonjs downlevel).
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", details?: unknown) {
    super(message, 429, "TOO_MANY_REQUESTS", details);
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal Server Error", details?: unknown) {
    // Not "operational": an InternalError is an unexpected failure, so the
    // handler suppresses its message in production.
    super(message, 500, "INTERNAL", details, false);
  }
}
