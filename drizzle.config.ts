import { defineConfig } from "drizzle-kit";

// DATABASE_URL is optional - if not set, JSON storage will be used
// drizzle-kit only needs it for migrations
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost/dummy";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
