import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export const hasDatabase = !!process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (hasDatabase) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  console.log("✓ PostgreSQL database connected");
} else {
  console.log("⚠ No DATABASE_URL found, using JSON file storage");
}

export { pool, db };
