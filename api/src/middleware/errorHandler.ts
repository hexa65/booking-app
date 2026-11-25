import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors.js";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: "Not found." });
}

function hasProp<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === "object" && value !== null && key in value;
}

/** Last stop. Known errors get their message; everything else becomes a safe 500 that leaks nothing. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) { res.status(err.status).json({ message: err.message }); return; }
  if (hasProp(err, "type") && err.type === "entity.parse.failed") { res.status(400).json({ message: "Invalid JSON." }); return; }
  if (hasProp(err, "type") && err.type === "entity.too.large") { res.status(400).json({ message: "Request is too large." }); return; }
  if (hasProp(err, "code") && err.code === "23505") { res.status(409).json({ message: "That already exists." }); return; }
  if (hasProp(err, "code") && err.code === "23P01") { res.status(409).json({ message: "That time was just taken." }); return; }
  console.error("Unhandled error:", err instanceof Error ? err.message : "unknown error"); // never log tokens or bodies
  res.status(500).json({ message: "Something went wrong on our side. Please try again." });
}
