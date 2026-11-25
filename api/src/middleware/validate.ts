import type { z } from "zod";
import { badRequest } from "../errors.js";

/** Validates untrusted input. Returns typed data, or throws a 400 with a plain message. */
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    throw badRequest(`${where}${issue?.message ?? "Invalid input."}`);
  }
  return result.data;
}

/** Express 5 types params as string | string[] | undefined, so we narrow here, once. */
export function parseId(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) throw badRequest("Invalid id.");
  const id = Number(value);
  if (id < 1) throw badRequest("Invalid id.");
  return id;
}
