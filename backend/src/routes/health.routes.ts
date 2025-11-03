import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { MongoClient } from 'mongodb';

const prisma = new PrismaClient();
const r = Router();

// /api/health - lightweight health check for Postgres (Prisma), Redis and Mongo
r.get('/health', async (_req: Request, res: Response) => {
  const out: { ok: boolean; services: Record<string, any> } = { ok: true, services: {} };

  // Postgres / Prisma
  try {
    await prisma.$queryRaw`SELECT 1`;
    out.services.postgres = { ok: true };
  } catch (e: any) {
    out.services.postgres = { ok: false, error: e && e.message ? e.message : String(e) };
    out.ok = false;
  }

  // Redis
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      out.services.redis = { ok: false, error: 'REDIS_URL not configured' };
      out.ok = false;
    } else {
      const rc = new Redis(redisUrl, { connectTimeout: 1000, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
      try {
        const p = await rc.ping();
        out.services.redis = { ok: p === 'PONG' };
        if (p !== 'PONG') out.ok = false;
      } catch (e: any) {
        out.services.redis = { ok: false, error: e && e.message ? e.message : String(e) };
        out.ok = false;
      } finally {
        try { rc.disconnect(); } catch {}
      }
    }
  } catch (e: any) {
    out.services.redis = { ok: false, error: e && e.message ? e.message : String(e) };
    out.ok = false;
  }

  // Mongo
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      out.services.mongo = { ok: false, error: 'MONGO_URI not configured' };
      out.ok = false;
    } else {
      const mc = new MongoClient(mongoUri, { connectTimeoutMS: 1000, serverSelectionTimeoutMS: 1000 });
      try {
        await mc.connect();
        await mc.db().command({ ping: 1 });
        out.services.mongo = { ok: true };
      } catch (e: any) {
        out.services.mongo = { ok: false, error: e && e.message ? e.message : String(e) };
        out.ok = false;
      } finally {
        try { await mc.close(); } catch {}
      }
    }
  } catch (e: any) {
    out.services.mongo = { ok: false, error: e && e.message ? e.message : String(e) };
    out.ok = false;
  }

  res.json(out);
});

export default r;
