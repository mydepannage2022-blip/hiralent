export type CompareOptions = {
  strict?: boolean; // if true, only normalize newlines and compare exact
  ignoreCase?: boolean;
  collapseWhitespace?: boolean;
};

function toStr(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return String(v);
  } catch (e) {
    return '';
  }
}

export function normalizeOutput(s: any, opts: CompareOptions = {}): string {
  let str = toStr(s);
  // strip ANSI escape sequences
  str = str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  // Normalize CRLF -> LF
  str = str.replace(/\r\n/g, '\n');
  // Replace non-breaking spaces with normal space
  str = str.replace(/\u00A0/g, ' ');
  // Remove trailing newlines and trailing whitespace
  str = str.replace(/[ \t]+$/gm, '');
  // Optionally collapse multiple whitespace (spaces/tabs/newlines) into single spaces
  if (opts.collapseWhitespace) {
    // normalize any unicode whitespace to ASCII space then collapse
    str = str.replace(/\s+/g, ' ').trim();
    return opts.ignoreCase ? str.toLowerCase() : str;
  }
  // Trim leading/trailing whitespace/newlines
  str = str.trim();
  return opts.ignoreCase ? str.toLowerCase() : str;
}

export function compareOutputs(expected: any, actual: any, overrideOpts?: CompareOptions): boolean {
  const strictEnv = (process.env.RUNNER_STRICT_COMPARE || '0') === '1';
  const ignoreCaseEnv = (process.env.RUNNER_COMPARE_IGNORE_CASE || '0') === '1';
  const collapseEnv = (process.env.RUNNER_COMPARE_COLLAPSE_WHITESPACE || '1') === '1';

  const opts: CompareOptions = overrideOpts ?? {
    strict: strictEnv,
    ignoreCase: ignoreCaseEnv,
    collapseWhitespace: collapseEnv,
  };

  // If strict mode, only normalize newlines and trim
  if (opts.strict) {
    const a = normalizeOutput(actual, { strict: true, ignoreCase: opts.ignoreCase, collapseWhitespace: false });
    const e = normalizeOutput(expected, { strict: true, ignoreCase: opts.ignoreCase, collapseWhitespace: false });
    return a === e;
  }

  const a = normalizeOutput(actual, { ignoreCase: opts.ignoreCase, collapseWhitespace: opts.collapseWhitespace });
  const e = normalizeOutput(expected, { ignoreCase: opts.ignoreCase, collapseWhitespace: opts.collapseWhitespace });
  return a === e;
}

export default { normalizeOutput, compareOutputs };
