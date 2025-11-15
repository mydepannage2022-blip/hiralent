// Try to use pino if available; fall back to a console-based logger when running tests
let logger: any;
try {
	// Require dynamically so TypeScript won't fail compilation when node_modules is incomplete
	// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
	const pino = require('pino');
	logger = pino({ level: process.env.LOG_LEVEL || 'info' });
} catch (e) {
	// Minimal console fallback implementing the pino-like API used by the codebase
	const noop = (...args: any[]) => {
		// no-op if console isn't desired
	};
	logger = {
		info: console.log.bind(console),
		warn: console.warn.bind(console),
		error: console.error.bind(console),
		debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
		child: () => logger,
		// provide a minimal trace function if used
		trace: console.debug ? console.debug.bind(console) : noop,
	};
}

export default logger;
