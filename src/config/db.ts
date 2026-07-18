import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export let isMongoConnected = false;

export const connectDB = async (): Promise<boolean> => {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventify_tasks';
  
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 3000, // Timeout quickly if MongoDB is offline
    });
    isMongoConnected = true;
    console.log('🔌 MongoDB Connected Successfully!');
    return true;
  } catch (error: any) {
    isMongoConnected = false;
    console.warn('⚠️ WARNING: MongoDB connection failed. Environment variables or server might be offline.');
    console.warn(`Error: ${error.message}`);
    console.warn('📁 Fallback: Backend will use local JSON-based file storage (Zero-setup Mode).');
    return false;
  }
};
