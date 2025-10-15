import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use ws for WebSocket support
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set. Please configure your database connection.");
}

// Create the Neon SQL executor and drizzle instance
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export default db;
