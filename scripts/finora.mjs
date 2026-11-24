import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { configureDatabase } from './data-directory.mjs';

const require = createRequire(import.meta.url);
const [mode, ...arguments_] = process.argv.slice(2);
process.env.NEXT_TELEMETRY_DISABLED = '1';

function run(entry, args) {
  const result = spawnSync(process.execPath, [require.resolve(entry), ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (mode === 'build') {
  run('next/dist/bin/next', ['build', ...arguments_]);
} else if (['dev', 'start', 'setup', 'validate'].includes(mode)) {
  const file = configureDatabase(mode !== 'validate');
  if (mode === 'validate') {
    run('prisma/build/index.js', ['validate']);
  } else {
    run('prisma/build/index.js', ['migrate', 'deploy']);
    await (await import('./seed.mjs')).seed();
    if (mode === 'setup') console.log(`Finora SQLite: ${file}`);
    else {
      const [flag, port] = arguments_;
      if (arguments_.length && !(['--port', '-p'].includes(flag) && /^\d{1,5}$/.test(port ?? '') && Number(port) > 0 && Number(port) <= 65535 && arguments_.length === 2)) {
        throw new Error('Supported option: --port <1–65535>');
      }
      run('next/dist/bin/next', [mode, '--hostname', '127.0.0.1', ...arguments_]);
    }
  }
} else {
  throw new Error('Expected dev, start, setup, validate, or build.');
}
