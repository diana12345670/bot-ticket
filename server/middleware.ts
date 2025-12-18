import { Request, Response, NextFunction } from "express";
import { serverLogger } from "./logger";
import { randomBytes } from "crypto";

const generateId = () => randomBytes(8).toString("hex");

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || generateId();
  res.setHeader("x-request-id", req.headers["x-request-id"]);
  next();
};

export const healthCheckMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.path === "/health" || req.path === "/") {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
    return;
  }
  next();
};

export const requestTimeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        serverLogger.warn("Request timeout", {
          path: req.path,
          method: req.method,
          timeout: `${timeout}ms`,
        });
        res.status(408).json({
          error: "Request Timeout",
          statusCode: 408,
        });
      }
    }, timeout);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
};
