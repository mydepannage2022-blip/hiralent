import IORedis from 'ioredis';

let redis: IORedis | null = null;

export function getRedis() {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL missing');
    }

    // ✅ CORRECT - BullMQ works properly
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // No job duplicates!
      enableReadyCheck: false,    // Better for Docker!
    });
  }

  return redis;
}
