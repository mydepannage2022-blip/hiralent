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

async function writeWorkDir(code: string, testCases: { input: string; expected_output: string }[]) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-'));
  // write code as main.py for python for now
  await fs.writeFile(path.join(tmp, 'main.py'), code, 'utf-8');
  // write tests.json expected by runner entrypoint
  const tests = testCases.map((t) => ({ input: t.input, expected: t.expected_output }));
  await fs.writeFile(path.join(tmp, 'tests.json'), JSON.stringify(tests), 'utf-8');
  return tmp;
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

export async function dispatch_to_runner(code: string, testCases: { input: string; expected_output: string }[], timeoutMs = 20000) {
  const workdir = await writeWorkDir(code, testCases);

  // If an HTTP runner service is configured, prefer calling it (useful for a local FastAPI stub)
  const runnerHttp = process.env.RUNNER_HTTP_URL;
  if (runnerHttp) {
    try {
      logger.info({ runnerHttp }, 'dispatching to HTTP runner');
      const resp = await axios.post(`${runnerHttp.replace(/\/$/, '')}/run`, { code, tests: testCases }, { timeout: timeoutMs });
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
  if (RUNNER_DOCKER_IMAGE) {
    const dockerCmdBase = ['docker', 'run', '--rm', '-v', `${workdir}:/work:ro`, '--network', 'none', '-e', `TEST_TIMEOUT_S=${TEST_TIMEOUT_S}`, '--memory', DOCKER_MEMORY, '--cpus', DOCKER_CPUS];
    if (USE_RUNSC) {
      dockerCmdBase.push('--runtime', 'runsc');
    }
    dockerCmdBase.push(RUNNER_DOCKER_IMAGE, 'python', '/entrypoint.py');

    let lastErr: any = null;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        logger.info({ submissionAttempt: attempt, image: RUNNER_DOCKER_IMAGE }, 'dispatching to docker runner');
        const out = await runProcess(dockerCmdBase, {}, undefined, timeoutMs);
        await fs.rm(workdir, { recursive: true, force: true });
        try {
          const parsed = JSON.parse(out);
          try {
            RunnerResultSchema.parse(parsed);
          } catch (ve) {
            if (ve instanceof ZodError) {
              logger.warn({ submissionAttempt: attempt, validationErrors: ve.issues }, 'runner response validation failed');
            } else {
              logger.warn({ submissionAttempt: attempt, err: String(ve) }, 'runner response validation exception');
            }
          }
          return parsed;
        } catch (e) {
          logger.warn({ attempt, rawOutput: out }, 'failed to parse runner output as JSON');
          throw e;
        }
      } catch (e: any) {
        lastErr = e;
        logger.warn({ attempt, err: String(e) }, 'runner docker attempt failed');
        // small backoff
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    await fs.rm(workdir, { recursive: true, force: true });
    throw lastErr || new Error('docker runner failed');
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
    out = await runProcess(['python', entrypoint], { WORK_DIR: workdir, TEST_TIMEOUT_S }, undefined, TIMEOUT_MS);
    await fs.rm(workdir, { recursive: true, force: true });
    return JSON.parse(out);
  } catch (e) {
    logger.warn({ err: String(e) }, 'local runner attempt failed, will retry once');
    // try one retry
    out = await runProcess(['python', entrypoint], { WORK_DIR: workdir, TEST_TIMEOUT_S }, undefined, TIMEOUT_MS);
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
