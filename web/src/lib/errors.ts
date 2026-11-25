import { isAxiosError } from "axios";

/** Turns anything thrown into one plain sentence the person can act on. */
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") return data.message;
    if (err.code === "ECONNABORTED") return "The server is taking too long to answer. It may be waking up. Wait a moment and try again.";
    if (!err.response) return "Cannot reach the server. Check your internet and try again.";
    return "Something went wrong. Please try again.";
  }
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}
export function errorStatus(err: unknown): number | null { return isAxiosError(err) && err.response ? err.response.status : null; }
