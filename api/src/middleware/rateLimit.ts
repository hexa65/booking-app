import { rateLimit } from "express-rate-limit";

function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many requests. Please wait a few minutes and try again." },
    skip: () => process.env.DISABLE_RATE_LIMIT === "true",
  });
}
export const loginLimiter = limiter(15 * 60 * 1000, 10);   // 10 login/register tries per 15 minutes per address
export const publicLimiter = limiter(60 * 1000, 60);        // used on public booking endpoints later
