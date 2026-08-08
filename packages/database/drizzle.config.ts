import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
import { join } from "path";

// Load .env from the repository root if available
dotenv.config({ path: join(__dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in environment variables.");
}

export default {
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
