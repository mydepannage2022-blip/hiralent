import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import logger from '../lib/logger';
import { RunnerResultSchema } from '../validation/execution.validation';
import { ZodError } from 'zod';
import axios from 'axios';

const RETRIES = parseInt(process.env.RUNNER_RETRIES || '2', 10);
const TIMEOUT_MS = parseInt(process.env.RUNNER_TIMEOUT_MS || '20000', 10);
const DOCKER_MEMORY = process.env.RUNNER_DOCKER_MEMORY || '256m';
const DOCKER_CPUS = process.env.RUNNER_DOCKER_CPUS || '0.5';

const RUNNER_DOCKER_IMAGE = process.env.RUNNER_DOCKER_IMAGE || '';
const USE_RUNSC = process.env.RUNNER_USE_RUNSC === '1';
const TEST_TIMEOUT_S = process.env.TEST_TIMEOUT_S || '2.0';

async function writeWorkDir(code: string, testCases: { input: string; expected_output?: string; expected?: string }[], language = 'python') {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-'));
  // write code to a language-specific filename
  const lang = (language || 'python').toLowerCase();
  let filename = 'main.py';
  if (lang === 'python' || lang === 'py') filename = 'main.py';
  else if (['js','javascript','node'].includes(lang)) filename = 'main.js';
  else if (['ts','typescript'].includes(lang)) filename = 'main.ts';
  else if (lang === 'java') filename = 'Main.java';
  else if (lang === 'cpp' || lang === 'c++') filename = 'main.cpp';
  else if (lang === 'go') filename = 'main.go';
  else if (lang === 'ruby' || lang === 'rb') filename = 'main.rb';

  await fs.writeFile(path.join(tmp, filename), code, 'utf-8');
  // write tests.json expected by runner entrypoint
  const tests = testCases.map((t) => ({ input: t.input, expected: t.expected || t.expected_output }));
  await fs.writeFile(path.join(tmp, 'tests.json'), JSON.stringify(tests), 'utf-8');
  return tmp;
}

async function tryRunPythonWithAlternatives(entrypoint: string, env: NodeJS.ProcessEnv, timeoutMs: number) {
  const candidates = ['python', 'py', 'python3'];
  let lastErr: any = null;
  for (const exe of candidates) {
    try {
      logger.info({ exe }, 'trying python executable');
      const out = await runProcess([exe, entrypoint], env, undefined, timeoutMs);
      return out;
    } catch (e: any) {
      lastErr = e;
      // If the executable was not found, try the next candidate
      if (e && (e.code === 'ENOENT' || String(e).includes('spawn') && String(e).includes('ENOENT'))) {
        logger.warn({ exe }, 'python executable not found, trying next');
        continue;
      }
      // other errors: log and try next (allow retry logic above to handle it)
      logger.warn({ exe, err: String(e) }, 'python attempt failed, trying next candidate');
    }
  }
  // none succeeded
  throw lastErr || new Error('no python executable found');
}

function runProcess(cmd: string[], env: NodeJS.ProcessEnv, cwd?: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd[0], cmd.slice(1), { env: { ...process.env, ...env }, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (b) => (out += b.toString()));
    p.stderr.on('data', (b) => (err += b.toString()));
    let killed = false;
    const to = setTimeout(() => {
      killed = true;
      try { p.kill('SIGKILL'); } catch (e) {}
      reject(new Error('Runner timeout'));
    }, timeoutMs);
    p.on('exit', (code) => {
      clearTimeout(to);
      if (killed) return;
      if (code !== 0 && !out) {
        return reject(new Error(`Runner failed (code ${code}): ${err.slice(0,2000)}`));
      }
      resolve(out);
    });
    p.on('error', (e) => { clearTimeout(to); reject(e); });
  });
}

export async function dispatch_to_runner(code: string, testCases: { input: string; expected_output?: string; expected?: string }[], timeoutMs = 20000, language = 'python') {
  const workdir = await writeWorkDir(code, testCases, language);

  // If an HTTP runner service is configured, prefer calling it (useful for a local FastAPI stub)
  const runnerHttp = process.env.RUNNER_HTTP_URL;
  if (runnerHttp) {
    try {
      logger.info({ runnerHttp }, 'dispatching to HTTP runner');
      const resp = await axios.post(`${runnerHttp.replace(/\/$/, '')}/run`, { code, tests: testCases, language }, { timeout: timeoutMs });
      await fs.rm(workdir, { recursive: true, force: true });
      if (resp && resp.data) {
        try {
          RunnerResultSchema.parse(resp.data);
        } catch (ve) {
          if (ve instanceof ZodError) {
            // ZodError exposes `issues` for detailed validation information
            logger.warn({ validationErrors: ve.issues }, 'runner HTTP response validation failed');
          }
        }
        return resp.data;
      }
    } catch (e) {
      logger.warn({ err: String(e) }, 'HTTP runner call failed, falling back to other dispatch methods');
    }
  }

  // If Docker image configured, run via docker
  // determine docker image: explicit RUNNER_DOCKER_IMAGE takes precedence, otherwise choose per-language image
  const languageKey = (language || 'python').toLowerCase();
  const defaultImageMap: Record<string, string> = {
    python: 'python:3.11-slim',
    py: 'python:3.11-slim',
    javascript: 'node:18-slim',
    js: 'node:18-slim',
    node: 'node:18-slim',
    typescript: 'node:18-slim',
    ts: 'node:18-slim',
    java: 'openjdk:17-slim',
    cpp: 'gcc:12',
    'c++': 'gcc:12',
    go: 'golang:1.20',
    ruby: 'ruby:3.1-slim'
  };

  const selectedImage = RUNNER_DOCKER_IMAGE || defaultImageMap[languageKey] || '';
  if (selectedImage) {
    // check docker available
    try {
      await runProcess(['docker', '--version'], {}, undefined, 5000);
    } catch (e: any) {
      await fs.rm(workdir, { recursive: true, force: true });
      throw new Error('Docker not available on host. Start Docker Desktop or install Docker to use containerized execution.');
    }

    const dockerCmdBase = ['docker', 'run', '--rm', '-v', `${workdir}:/work:ro`, '--network', 'none', '-e', `TEST_TIMEOUT_S=${TEST_TIMEOUT_S}`, '--memory', DOCKER_MEMORY, '--cpus', DOCKER_CPUS];
    if (USE_RUNSC) {
      dockerCmdBase.push('--runtime', 'runsc');
    }
    // We'll run each test by invoking the container with the appropriate command for the language,
    // capture stdout/stderr and assemble a runner-style JSON result here.
    const testsSummary: any[] = [];
    let anyPassed = true;
    let lastErr: any = null;

    for (let i = 0; i < testCases.length; i++) {
      const t = testCases[i];
      const testInput = (t as any).input || '';
      const expected = (t as any).expected || (t as any).expected_output || '';
      let cmd: string[] = [];

      // Select command inside container depending on language
      if (languageKey === 'python' || languageKey === 'py') {
        cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `python /work/main.py`];
      } else if (['js','javascript','node','typescript','ts'].includes(languageKey)) {
        // use node to run main.js (for TypeScript we expect ts-node via npx if available in image)
        const runCmd = languageKey === 'typescript' || languageKey === 'ts' ? `npx ts-node /work/main.ts` : `node /work/main.js`;
        cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', runCmd];
      } else if (languageKey === 'java') {
        cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `javac /work/Main.java && java -cp /work Main`];
      } else if (languageKey === 'cpp' || languageKey === 'c++') {
        cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `g++ /work/main.cpp -O2 -std=c++17 -o /work/main && /work/main`];
      } else if (languageKey === 'go') {
        cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `go run /work/main.go`];
      } else if (languageKey === 'ruby') {
        cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `ruby /work/main.rb`];
      } else {
        // unsupported
        await fs.rm(workdir, { recursive: true, force: true });
        throw new Error(`No docker image/command for language ${language}`);
      }

      try {
        logger.info({ test: i + 1, cmd: cmd.slice(0, 6) }, 'running docker for test');
        // runProcess accepts cmd as array and spawns; we need to pass entire array
        const out = await runProcess(cmd, {}, undefined, timeoutMs);
        const outStr = out || '';
        const outNorm = outStr.replace(/\r\n/g, '\n').trim();
        const passed = expected ? outNorm === expected.trim() : outStr.length > 0;
        if (!passed) anyPassed = false;
        testsSummary.push({ id: i + 1, pass: passed, timeMs: 0, memKb: 0, stdout: outStr, output: outStr, stderr: '', expected_output: expected });
      } catch (e: any) {
        lastErr = e;
        anyPassed = false;
        logger.warn({ test: i + 1, err: String(e) }, 'docker run failed for test');
        testsSummary.push({ id: i + 1, pass: false, timeMs: 0, memKb: 0, stdout: '', output: '', stderr: String(e), expected_output: expected });
      }
    }

    await fs.rm(workdir, { recursive: true, force: true });
    // assemble runner-like response
    const score = Math.round((testsSummary.filter((t) => t.pass).length / Math.max(1, testsSummary.length)) * 100);
    return { passed: testsSummary.every((t) => t.pass), score, runtimeMs: 0, memoryKb: 0, testsSummary };
  }

  // Else run local python entrypoint
  // Use repository runner-python entrypoint directly
  const entrypoint = path.join(process.cwd(), '..', 'runner-python', 'entrypoint.py');
  // If entrypoint not found, throw
  try {
    await fs.access(entrypoint);
  } catch (e) {
    throw new Error('Runner entrypoint not found and RUNNER_DOCKER_IMAGE not set');
  }

  let out: string | null = null;
  try {
    out = await tryRunPythonWithAlternatives(entrypoint, { WORK_DIR: workdir, TEST_TIMEOUT_S }, TIMEOUT_MS);
    await fs.rm(workdir, { recursive: true, force: true });
    return JSON.parse(out);
  } catch (e) {
    logger.warn({ err: String(e) }, 'local runner attempt failed, will retry once');
    // try one retry using alternatives again
    out = await tryRunPythonWithAlternatives(entrypoint, { WORK_DIR: workdir, TEST_TIMEOUT_S }, TIMEOUT_MS);
    await fs.rm(workdir, { recursive: true, force: true });
    try {
      const parsed = JSON.parse(out as string);
      try {
        RunnerResultSchema.parse(parsed);
      } catch (ve) {
          if (ve instanceof ZodError) {
          logger.warn({ validationErrors: ve.issues }, 'local runner retry response validation failed');
        } else {
          logger.warn({ err: String(ve) }, 'local runner retry response validation exception');
        }
      }
      return parsed;
    } catch (e) {
      logger.warn({ rawOutput: out }, 'failed to parse local runner retry output as JSON');
      throw e;
    }
  }
  await fs.rm(workdir, { recursive: true, force: true });
  return JSON.parse(out);
}
