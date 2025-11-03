import { MongoClient } from "mongodb";

const uri = `${process.env.MONGO_URI!}/hiralent`;
const client = new MongoClient(uri);

export const connectDB = async () => {
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
  } catch (err) {
    // Log a concise warning in dev to avoid large stack spam. If you need full
    // stack traces for debugging, set DEBUG_MONGO=1 in your env.
    const showStack = (process.env.DEBUG_MONGO || process.env.DEBUG) === '1';
    if (showStack) {
      console.error('❌ MongoDB connection failed:', err);
    } else {
      try {
        const msg = (err && (err as any).message) ? (err as any).message : String(err);
        console.warn(`❌ MongoDB connection failed: ${msg}`);
      } catch {
        console.warn('❌ MongoDB connection failed');
      }
    }
    // In production we must stop the process; in dev we continue with a null DB.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null as any;
  }
};
