// Dev helper: start the Express server and the in-memory poller in the same Node process.
// Usage: `pnpm run dev:single` (runs ts-node on this file)

// Ensure we use the in-memory queue for local single-process mode
process.env.FORCE_INMEMORY = process.env.FORCE_INMEMORY || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start the server (this file calls app.listen when required)
import '../server';

// Import and start the poller
import { pollerMain } from '../workers/run.worker';

(async () => {
  try {
    console.log('Starting in single-process dev mode: server + in-memory poller');
    await pollerMain();
  } catch (e) {
    console.error('Dev poller error', e);
    process.exit(1);
  }
})();
