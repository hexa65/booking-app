import { Router } from "express";
import { config } from "../config.js";
import { pool, withTransaction } from "../db.js";
import { conflict, notFound, unauthorized } from "../errors.js";
import { recordEvent } from "../lib/data.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { isValidSlug, slugCandidate, slugify } from "../lib/slug.js";
import { signToken } from "../lib/tokens.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";
import { parseBody } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../schemas.js";

export const authRouter = Router();

interface UserRow { id: number; email: string; role: "owner" | "staff"; password_hash: string; business_id: number; business_name: string; business_slug: string; }

function publicUser(row: UserRow) {
  return { id: row.id, email: row.email, role: row.role, businessId: row.business_id, businessName: row.business_name, businessSlug: row.business_slug };
}

// Compared against when the email is unknown, so "no such email" takes as long as "wrong password".
const dummyHash = hashPassword("not-a-real-password");

authRouter.post("/register", loginLimiter, async (req, res) => {
  const input = parseBody(registerSchema, req.body);
  const hash = await hashPassword(input.password);

  const user = await withTransaction(async (client) => {
    const taken = await client.query("SELECT 1 FROM users WHERE email = $1", [input.email]);
    if (taken.rowCount) throw conflict("That email is already registered. Try logging in.");

    const base = slugify(input.businessName);
    let slug = "";
    for (let attempt = 1; attempt <= 50; attempt++) {
      const candidate = slugCandidate(base, attempt);
      if (!isValidSlug(candidate)) continue;
      const exists = await client.query("SELECT 1 FROM businesses WHERE slug = $1", [candidate]);
      if (!exists.rowCount) { slug = candidate; break; }
    }
    if (!slug) throw conflict("Could not find a free booking link. Try a different business name.");

    // Business and owner are created in ONE transaction: both exist, or neither does.
    const biz = await client.query<{ id: number }>(
      "INSERT INTO businesses (name, slug) VALUES ($1, $2) RETURNING id", [input.businessName, slug]);
    const businessId = biz.rows[0]!.id;
    const u = await client.query<{ id: number }>(
      "INSERT INTO users (business_id, email, password_hash, role) VALUES ($1, $2, $3, 'owner') RETURNING id",
      [businessId, input.email, hash]);
    await recordEvent(client, businessId, "business_signed_up");
    return { id: u.rows[0]!.id, email: input.email, role: "owner" as const, businessId, businessName: input.businessName, businessSlug: slug };
  });

  const token = await signToken({ userId: user.id, businessId: user.businessId, role: user.role }, config.jwtSecret);
  res.status(201).json({ token, user });
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const input = parseBody(loginSchema, req.body);
  const found = await pool.query<UserRow>(
    `SELECT u.id, u.email, u.role, u.password_hash, u.business_id, b.name AS business_name, b.slug AS business_slug
       FROM users u JOIN businesses b ON b.id = u.business_id WHERE u.email = $1`, [input.email]);
  const row = found.rows[0];
  const ok = await verifyPassword(input.password, row ? row.password_hash : await dummyHash);
  if (!row || !ok) throw unauthorized("Email or password is incorrect."); // same message for both cases
  const token = await signToken({ userId: row.id, businessId: row.business_id, role: row.role }, config.jwtSecret);
  res.json({ token, user: publicUser(row) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { userId, businessId } = getAuth(req);
  const found = await pool.query<UserRow>(
    `SELECT u.id, u.email, u.role, u.password_hash, u.business_id, b.name AS business_name, b.slug AS business_slug
       FROM users u JOIN businesses b ON b.id = u.business_id WHERE u.id = $1 AND u.business_id = $2`, [userId, businessId]);
  const row = found.rows[0];
  if (!row) throw notFound("Account not found.");
  res.json({ user: publicUser(row) });
});
