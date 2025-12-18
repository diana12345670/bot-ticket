import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { dbLogger } from "./logger";

const { Pool } = pg;

export const hasDatabase = !!process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (hasDatabase) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      dbLogger.error("Unexpected error on idle client", { error: err.message });
    });

    db = drizzle(pool, { schema });
    dbLogger.success("PostgreSQL database pool initialized");
  } catch (error: any) {
    dbLogger.error("Failed to initialize database pool", { error: error.message });
  }
} else {
  dbLogger.warn("No DATABASE_URL found, will use JSON file storage");
}

export { pool, db };
