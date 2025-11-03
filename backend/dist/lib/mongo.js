"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
const uri = `${process.env.MONGO_URI}/hiralent`;
const client = new mongodb_1.MongoClient(uri);
const connectDB = async () => {
    // Allow skipping Mongo connection in local dev when Mongo isn't available
    const forceSkip = (process.env.FORCE_SKIP_MONGO || '').toLowerCase() === '1' || (process.env.FORCE_SKIP_MONGO || '').toLowerCase() === 'true';
    if (forceSkip) {
        console.log('FORCE_SKIP_MONGO enabled — skipping MongoDB connection attempt');
        return null;
    }
    try {
        await client.connect();
        console.log("✅ MongoDB connected successfully");
        return client.db();
    }
    catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        // In development, allow the server to continue even if MongoDB isn't available.
        // This prevents the process from exiting when running locally without all services.
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        return null;
    }
};
exports.connectDB = connectDB;
