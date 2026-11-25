import { jwtVerify, SignJWT } from "jose";

export interface TokenPayload { userId: number; businessId: number; role: "owner" | "staff"; }

const encode = (secret: string): Uint8Array => new TextEncoder().encode(secret);

/** A short-lived login ticket. 12 hours, because the token sits in localStorage. */
export async function signToken(payload: TokenPayload, secret: string, expiresIn = "12h"): Promise<string> {
  return new SignJWT({ businessId: payload.businessId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encode(secret));
}

/** Returns the payload, or null for ANY problem (bad signature, expired, wrong shape). */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encode(secret), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const { businessId, role } = payload;
    if (!Number.isInteger(userId) || typeof businessId !== "number" || !Number.isInteger(businessId)) return null;
    if (role !== "owner" && role !== "staff") return null;
    return { userId, businessId, role };
  } catch {
    return null;
  }
}
