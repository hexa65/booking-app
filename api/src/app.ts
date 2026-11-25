import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { servicesRouter } from "./routes/services.js";
import { staffRouter } from "./routes/staff.js";
import { bookingsRouter } from "./routes/bookings.js";
import { customersRouter } from "./routes/customers.js";
import { queueRouter } from "./routes/queue.js";
import { settingsRouter } from "./routes/settings.js";
import { statsRouter } from "./routes/stats.js";
import { publicRouter } from "./routes/public.js";

// app.ts builds the Express app and exports it WITHOUT listening, so tests can use it directly.
// index.ts starts the real server. That split is why tests never need a network port.
export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.corsOrigin })); // one exact origin, not "*"
app.use(express.json({ limit: "100kb" }));

// READ_ONLY switch: during a demo or a migration, block every write with one setting.
app.use((req: Request, res: Response, next: NextFunction) => {
  const safe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  if (config.readOnly && !safe) { res.status(403).json({ message: "The app is in read-only mode right now." }); return; }
  next();
});

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.use("/auth", authRouter);
app.use("/services", requireAuth, servicesRouter);
app.use("/staff", requireAuth, staffRouter);
app.use("/bookings", requireAuth, bookingsRouter);
app.use("/customers", requireAuth, customersRouter);
app.use("/queue", requireAuth, queueRouter);
app.use("/settings", requireAuth, settingsRouter);
app.use("/stats", requireAuth, statsRouter);
app.use("/public", publicRouter);

app.use(notFoundHandler);
app.use(errorHandler);
