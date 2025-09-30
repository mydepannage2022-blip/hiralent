"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('✅ Postgresql connected successfully');
    }
    catch (err) {
        console.error('❌ Failed to connect to database', err);
        process.exit(1);
    }
}
connectDB();
exports.default = prisma;
