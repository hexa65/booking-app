import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { unauthorized } from "../errors.js";
import { verifyToken } from "../lib/tokens.js";
import type { TokenPayload } from "../lib/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { interface Request { auth?: TokenPayload; } }
}

/** The doorman: reads the key card, checks it, and remembers WHO and WHICH BUSINESS from it. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const payload = token ? await verifyToken(token, config.jwtSecret) : null;
  if (!payload) throw unauthorized();
  req.auth = payload;
  next();
}

/** Route code calls this to get the verified identity. The business id NEVER comes from the body or URL. */
export function getAuth(req: Request): TokenPayload {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
