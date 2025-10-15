import dotenv from "dotenv";
dotenv.config();

// MongoDB connection
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let isMongoConnected = false;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set, skipping MongoDB connection');
    return;
  }

  if (isMongoConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error);
});

// PostgreSQL connection (for existing features)
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// For development, we need to handle SSL configuration more flexibly
if (process.env.NODE_ENV === 'development') {
  // Disable SSL verification for development environment to handle self-signed certificates
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
});
export const db = drizzle({ client: pool, schema });

export default mongoose;