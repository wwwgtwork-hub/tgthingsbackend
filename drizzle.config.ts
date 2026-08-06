import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL missing from .env file');
}

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  breakpoints: true,
  strict: true,
  verbose: true,
});
