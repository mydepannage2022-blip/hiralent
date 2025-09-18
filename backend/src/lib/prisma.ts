import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Postgresql connected successfully');
  } catch (err) {
    console.error('❌ Failed to connect to database', err);
    process.exit(1);
  }
}

connectDB();

export default prisma;
