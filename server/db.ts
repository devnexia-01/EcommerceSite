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

export default mongoose;