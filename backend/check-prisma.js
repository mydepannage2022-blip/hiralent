const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  console.log(Object.keys(p).filter(k=> typeof p[k] === 'object' || typeof p[k] === 'function'));
  await p.();
})();
