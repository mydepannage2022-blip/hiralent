import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const s = await prisma.codeSubmission.findFirst({ orderBy: { created_at: 'desc' } });
    console.log(JSON.stringify(s, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();
