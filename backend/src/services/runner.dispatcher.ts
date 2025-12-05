import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import logger from '../lib/logger';
import { RunnerResultSchema } from '../validation/execution.validation';
import { ZodError } from 'zod';
import axios from 'axios';
import { compareOutputs } from '../utils/outputNormalization';

const RETRIES = parseInt(process.env.RUNNER_RETRIES || '2', 10);
const TIMEOUT_MS = parseInt(process.env.RUNNER_TIMEOUT_MS || '20000', 10);
const DOCKER_MEMORY = process.env.RUNNER_DOCKER_MEMORY || '256m';
const DOCKER_CPUS = process.env.RUNNER_DOCKER_CPUS || '0.5';

const RUNNER_DOCKER_IMAGE = process.env.RUNNER_DOCKER_IMAGE || '';
const USE_RUNSC = process.env.RUNNER_USE_RUNSC === '1';
const TEST_TIMEOUT_S = process.env.TEST_TIMEOUT_S || '2.0';
// Optional override for a prebuilt TypeScript image. If not set, fall back to the
// default Node image so no language is preferred by default.
const RUNNER_TS_IMAGE = process.env.RUNNER_TS_IMAGE || '';
const RUNNER_PY_IMAGE = process.env.RUNNER_PY_IMAGE || '';
const RUNNER_JAVA_IMAGE = process.env.RUNNER_JAVA_IMAGE || '';
// Optional overrides for other prebuilt images
const RUNNER_GO_IMAGE = process.env.RUNNER_GO_IMAGE || '';
const RUNNER_RUBY_IMAGE = process.env.RUNNER_RUBY_IMAGE || '';
const RUNNER_CPP_IMAGE = process.env.RUNNER_CPP_IMAGE || '';
const RUNNER_CS_IMAGE = process.env.RUNNER_CS_IMAGE || '';

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
  else if (lang === 'c') filename = 'main.c';
  else if (lang === 'go') filename = 'main.go';
  else if (lang === 'ruby' || lang === 'rb') filename = 'main.rb';
  else if (lang === 'csharp' || lang === 'cs' || lang === 'c#') filename = 'Program.cs';

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

  // Decide runner mode: 'auto'|'docker'|'http'|'local'
  const runnerHttp = process.env.RUNNER_HTTP_URL;
  const RUNNER_MODE = (process.env.RUNNER_MODE || 'auto').toLowerCase();
  const preferHttp = RUNNER_MODE === 'http';
  const preferDocker = RUNNER_MODE === 'docker' || RUNNER_MODE === 'auto';

  const languageKey = (language || 'python').toLowerCase();
  const defaultImageMap: Record<string, string> = {
    python: RUNNER_PY_IMAGE || 'python:3.11-slim',
    py: RUNNER_PY_IMAGE || 'python:3.11-slim',
    javascript: RUNNER_TS_IMAGE || 'node:18-slim',
    js: RUNNER_TS_IMAGE || 'node:18-slim',
    node: RUNNER_TS_IMAGE || 'node:18-slim',
    typescript: RUNNER_TS_IMAGE || 'node:18-slim',
    ts: RUNNER_TS_IMAGE || 'node:18-slim',
    java: RUNNER_JAVA_IMAGE || 'openjdk:17-slim',
    cpp: RUNNER_CPP_IMAGE || 'gcc:12',
    c: RUNNER_CPP_IMAGE || 'gcc:12',
    'c++': RUNNER_CPP_IMAGE || 'gcc:12',
    go: RUNNER_GO_IMAGE || 'golang:1.20',
    ruby: RUNNER_RUBY_IMAGE || 'ruby:3.1-slim',
    csharp: RUNNER_CS_IMAGE || 'mcr.microsoft.com/dotnet/sdk:7.0',
    cs: RUNNER_CS_IMAGE || 'mcr.microsoft.com/dotnet/sdk:7.0'
  };

  const selectedImage = RUNNER_DOCKER_IMAGE || defaultImageMap[languageKey] || '';

  const tryHttpRunner = async () => {
    if (!runnerHttp) return null;
    try {
      logger.info({ runnerHttp }, 'dispatching to HTTP runner');
      const resp = await axios.post(`${runnerHttp.replace(/\/$/, '')}/run`, { code, tests: testCases, language }, { timeout: timeoutMs });
      if (resp && resp.data) {
        try {
          RunnerResultSchema.parse(resp.data);
        } catch (ve) {
          if (ve instanceof ZodError) {
            logger.warn({ validationErrors: ve.issues }, 'runner HTTP response validation failed');
          }
        }
        return resp.data;
      }
    } catch (e) {
      logger.warn({ err: String(e) }, 'HTTP runner call failed');
      return null;
    }
    return null;
  };

  // 1) If explicitly asked for HTTP, try it first
  if (preferHttp) {
    const r = await tryHttpRunner();
    if (r) {
      await fs.rm(workdir, { recursive: true, force: true });
      return r;
    }
  }

  // 2) If Docker is preferred and we have an image, try Docker
  if (preferDocker && selectedImage) {
    let dockerAvailable = false;
    try {
      await runProcess(['docker', '--version'], {}, undefined, 5000);
      dockerAvailable = true;
    } catch (e: any) {
      logger.warn('Docker not available on host, will fallback to HTTP/local runner');
      dockerAvailable = false;
    }

    if (dockerAvailable) {
      // Use a writable mount because compiled languages write build artifacts into /work
      const dockerCmdBase = ['docker', 'run', '--rm', '-v', `${workdir}:/work`, '--network', 'none', '-e', `TEST_TIMEOUT_S=${TEST_TIMEOUT_S}`, '--memory', DOCKER_MEMORY, '--cpus', DOCKER_CPUS];
      if (USE_RUNSC) dockerCmdBase.push('--runtime', 'runsc');

      const testsSummary: any[] = [];
      let anyPassed = true;

      for (let i = 0; i < testCases.length; i++) {
        const t = testCases[i];
        const testInput = (t as any).input || '';
        const expected = (t as any).expected || (t as any).expected_output || '';
        let cmd: string[] = [];

        if (languageKey === 'python' || languageKey === 'py') {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `cat <<'EOF' | python /work/main.py\n${testInput}\nEOF`];
        } else if (['js','javascript','node'].includes(languageKey)) {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `cat <<'EOF' | node /work/main.js\n${testInput}\nEOF`];
        } else if (['ts','typescript'].includes(languageKey)) {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `cat <<'EOF' | npx ts-node /work/main.ts\n${testInput}\nEOF`];
        } else if (languageKey === 'java') {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `javac /work/Main.java && java -cp /work Main`];
        } else if (languageKey === 'cpp' || languageKey === 'c++') {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `g++ /work/main.cpp -O2 -std=c++17 -o /work/main && /work/main`];
        } else if (languageKey === 'c') {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `gcc /work/main.c -O2 -std=c11 -o /work/main && /work/main`];
        } else if (languageKey === 'go') {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `go run /work/main.go`];
        } else if (languageKey === 'csharp' || languageKey === 'cs' || languageKey === 'c#') {
          // Create a temporary csproj and run the single-file Program.cs
          // The workdir contains Program.cs (written by writeWorkDir)
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `cat > /work/app.csproj <<'CS'\n<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net7.0</TargetFramework>\n  </PropertyGroup>\n</Project>\nCS\nprintf '%s' "${testInput}" | dotnet run --project /work/app.csproj`];
        } else if (languageKey === 'ruby') {
          cmd = [...dockerCmdBase, selectedImage, 'sh', '-c', `ruby /work/main.rb`];
        } else {
          await fs.rm(workdir, { recursive: true, force: true });
          throw new Error(`No docker image/command for language ${language}`);
        }

        try {
          logger.info({ test: i + 1, cmd: cmd.slice(0, 6) }, 'running docker for test');
          const out = await runProcess(cmd, {}, undefined, timeoutMs);
          const outStr = out || '';
          const passed = (expected !== undefined && expected !== null && String(expected).length > 0)
            ? compareOutputs(expected, outStr)
            : outStr.length > 0;
          if (!passed) {
            anyPassed = false;
            // Log a helpful debug snapshot to diagnose normalization mismatches
            try {
              const { normalizeOutput } = await import('../utils/outputNormalization');
              const expectedNorm = normalizeOutput(expected);
              const actualNorm = normalizeOutput(outStr);
              logger.warn({ test: i + 1, expectedRaw: expected, actualRaw: outStr, expectedNorm, actualNorm }, 'test output mismatch (expected vs actual)');
            } catch (logErr) {
              logger.warn({ test: i + 1, expected: expected, actual: outStr, err: String(logErr) }, 'test mismatch and failed to compute normalized snapshot');
            }
          }
          testsSummary.push({ id: i + 1, pass: passed, timeMs: 0, memKb: 0, stdout: outStr, output: outStr, stderr: '', expected_output: expected });
        } catch (e: any) {
          logger.warn({ test: i + 1, err: String(e) }, 'docker run failed for test');
          testsSummary.push({ id: i + 1, pass: false, timeMs: 0, memKb: 0, stdout: '', output: '', stderr: String(e), expected_output: expected });
        }
      }

      await fs.rm(workdir, { recursive: true, force: true });
      const score = Math.round((testsSummary.filter((t) => t.pass).length / Math.max(1, testsSummary.length)) * 100);
      return { passed: testsSummary.every((t) => t.pass), score, runtimeMs: 0, memoryKb: 0, testsSummary };
    }

    // if docker not available, try HTTP fallback
    const httpRes = await tryHttpRunner();
    if (httpRes) {
      await fs.rm(workdir, { recursive: true, force: true });
      return httpRes;
    }
  }

  // Fallback: run local python entrypoint
  const entrypoint = path.join(process.cwd(), '..', 'runner-python', 'entrypoint.py');
  try {
    await fs.access(entrypoint);
  } catch (e) {
    throw new Error('Runner entrypoint not found and RUNNER_DOCKER_IMAGE not set');
  }

  try {
    const out = await tryRunPythonWithAlternatives(entrypoint, { WORK_DIR: workdir, TEST_TIMEOUT_S }, TIMEOUT_MS);
    await fs.rm(workdir, { recursive: true, force: true });
    return JSON.parse(out as string);
  } catch (e) {
    // one retry
    const out = await tryRunPythonWithAlternatives(entrypoint, { WORK_DIR: workdir, TEST_TIMEOUT_S }, TIMEOUT_MS);
    await fs.rm(workdir, { recursive: true, force: true });
    const parsed = JSON.parse(out as string);
    try {
      RunnerResultSchema.parse(parsed);
    } catch (ve) {
      if (ve instanceof ZodError) logger.warn({ validationErrors: ve.issues }, 'local runner retry response validation failed');
    }
    return parsed;
  }
}
