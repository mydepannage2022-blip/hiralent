import { dispatch_to_runner } from '../services/runner.dispatcher';

async function run() {
  const code = `print(input())\n`;
  const tests = [ { input: 'hello', expected_output: 'hello' } ];
  const res = await dispatch_to_runner(code, tests, 10000);
  console.log('integration runner result', res);
  if (!('score' in res)) throw new Error('no score in runner result');
}

run().then(() => console.log('integration.runner OK')).catch((e) => { console.error(e); process.exit(1); });
