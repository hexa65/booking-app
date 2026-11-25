import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}. See .env.example`);
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");

// Fails fast at start-up: better a clear crash now than a mystery later.
export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  corsOrigin: required("CORS_ORIGIN"),
  readOnly: process.env.READ_ONLY === "true",
} as const;
