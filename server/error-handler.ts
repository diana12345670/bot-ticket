import { Request, Response, NextFunction } from "express";
import { serverLogger } from "./logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, message, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(401, message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(500, message || "Database operation failed", details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class DiscordError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(500, message || "Discord API error", details);
    Object.setPrototypeOf(this, DiscordError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Default error values
  let statusCode = 500;
  let message = "Internal Server Error";
  let details: Record<string, any> = {};

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details || {};
  } else if (err instanceof SyntaxError) {
    statusCode = 400;
    message = "Invalid JSON in request body";
  } else if (err instanceof TypeError) {
    statusCode = 500;
    message = "Type error occurred";
    details = { originalMessage: err.message };
  }

  const duration = Date.now() - startTime;

  // Log the error with full context
  serverLogger.error("Request error handler", {
    statusCode,
    message,
    method: req.method,
    path: req.path,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get("user-agent")?.slice(0, 100),
    error: err instanceof Error ? err.message : "Unknown error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    ...details,
  });

  // Send response
  res.status(statusCode).json({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.headers["x-request-id"] || "unknown",
    ...(process.env.NODE_ENV === "development" && {
      details,
      stack: err.stack,
    }),
  });
};

// Async error wrapper
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
