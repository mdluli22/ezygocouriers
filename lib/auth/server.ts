import { Pool, QueryResult } from "pg";

// Create a single connection pool shared across the app
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err);
});

/**
 * Execute a parameterized SQL query.
 * Always use this helper — never query the pool directly.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log(`[DB] query: ${text} | duration: ${duration}ms | rows: ${result.rowCount}`);
    }
    return result;
  } catch (error) {
    console.error("[DB] Query error:", { text, params, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions.
 * Always release the client in a finally block.
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query("BEGIN");
 *   // ... queries
 *   await client.query("COMMIT");
 * } catch (e) {
 *   await client.query("ROLLBACK");
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
