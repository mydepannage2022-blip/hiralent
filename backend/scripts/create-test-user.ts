import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

(async () => {
  const prisma = new PrismaClient();
  try {
    const passHash = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test+candidate@example.com',
        full_name: 'Test Candidate',
        password_hash: passHash,
        role: 'candidate',
        is_email_verified: true,
      },
    });
    console.log('Created user:', user.user_id);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();
