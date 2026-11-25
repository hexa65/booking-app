import pg from "pg";
import { config } from "./config.js";

// By default pg turns DATE and TIMESTAMP columns into JavaScript Date objects (and shifts them by
// time zone). We want plain text: "2026-11-24" and "2026-11-24 10:30:00".
pg.types.setTypeParser(1082, (value: string) => value); // DATE
pg.types.setTypeParser(1114, (value: string) => value); // TIMESTAMP WITHOUT TIME ZONE
// Note: BIGINT (type 20) already comes back as text. Our money is INTEGER, so it is a number.

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

pool.on("error", (err: Error) => {
  // An idle connection died (Neon can drop them). Log it; the pool opens a new one when needed.
  console.error("Unexpected database pool error:", err.message);
});

/** Runs fn inside ONE transaction on ONE connection. Always releases the connection. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
