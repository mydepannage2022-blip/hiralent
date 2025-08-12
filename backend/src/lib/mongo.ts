import { MongoClient } from "mongodb";

const uri = `${process.env.MONGO_URI!}/hiralent`;
const client = new MongoClient(uri);

export const connectDB = async () => {
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully");
    return client.db();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};
