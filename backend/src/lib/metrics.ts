let register: any = { metrics: async () => '', contentType: 'text/plain; version=0.0.4' };
let runProcessed: any = { inc: () => {} };
let runFailed: any = { inc: () => {} };
let runDuration: any = { startTimer: () => () => {} };

try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const client = require('prom-client');
	const Registry = client.Registry;
	register = new Registry();
	runProcessed = new client.Counter({ name: 'hiralent_runs_processed_total', help: 'Total processed runs', registers: [register] });
	runFailed = new client.Counter({ name: 'hiralent_runs_failed_total', help: 'Total failed runs', registers: [register] });
	runDuration = new client.Histogram({ name: 'hiralent_run_duration_seconds', help: 'Run duration seconds', buckets: [0.1, 0.5, 1, 2, 5], registers: [register] });
} catch (e) {
	// prom-client not installed — use no-op implementations
}

export { register, runProcessed, runFailed, runDuration };
