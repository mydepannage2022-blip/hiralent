"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
const uri = `${process.env.MONGO_URI}/hiralent`;
const client = new mongodb_1.MongoClient(uri);
const connectDB = async () => {
    try {
        await client.connect();
        console.log("✅ MongoDB connected successfully");
        return client.db();
    }
    catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
