import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';

const isWindows = process.platform === 'win32';
const serviceLogs = new Map();
const services = [];
let cleaningUp = false;
let rejectedLegacyRequests = 0;
const unavailableLegacy = createServer((_request, response) => {
  rejectedLegacyRequests++;
  response.writeHead(503).end();
});

function command(name, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(name, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: isWindows,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${name} exited with ${code ?? signal}`)),
    );
  });
}

function startService(name, args, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    detached: !isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  serviceLogs.set(name, logs);
  const record = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 80) logs.shift();
  };
  child.stdout.on('data', record);
  child.stderr.on('data', record);
  child.once('exit', (code, signal) => {
    if (!cleaningUp && code !== 0) {
      process.stderr.write(`[e2e:${name}] exited with ${code ?? signal}\n${logs.join('')}\n`);
    }
  });
  services.push({ name, child });
}

async function waitFor(name, url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become ready at ${url}\n${serviceLogs.get(name)?.join('')}`);
}

function stopService(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // The process may already have exited between the checks.
  }
}

function cleanup() {
  if (cleaningUp) return;
  cleaningUp = true;
  unavailableLegacy.close();
  for (const { child } of services.reverse()) stopService(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    cleanup();
    process.exit(1);
  });
}

let exitCode = 1;
try {
  process.env.JWT_SECRET ||= 'playwright-test-secret-with-at-least-thirty-two-characters';
  await command('pnpm', ['demo:reset']);

  const sharedWebEnv = {
    NODE_ENV: 'production',
    API_URL: 'http://127.0.0.1:3001/api/v1',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001/api/v1',
  };
  startService('api', ['apps/api/dist/main.js'], {
    NODE_ENV: 'production',
    PORT: '3001',
    JWT_SECRET:
      process.env.JWT_SECRET || 'playwright-test-secret-with-at-least-thirty-two-characters',
  });
  startService(
    'passenger',
    [
      'apps/passenger-web/node_modules/next/dist/bin/next',
      'start',
      'apps/passenger-web',
      '-p',
      '3000',
    ],
    sharedWebEnv,
  );
  startService(
    'admin',
    ['apps/admin-web/node_modules/next/dist/bin/next', 'start', 'apps/admin-web', '-p', '3002'],
    sharedWebEnv,
  );
  startService('tracking', ['apps/tracking-simulator/dist/index.js'], {
    NODE_ENV: 'production',
    SIMULATOR_HEALTH_PORT: '3003',
  });

  await Promise.all([
    waitFor('api', 'http://127.0.0.1:3001/api/v1/status'),
    waitFor('passenger', 'http://127.0.0.1:3000'),
    waitFor('admin', 'http://127.0.0.1:3002/login'),
    waitFor('tracking', 'http://127.0.0.1:3003/status'),
  ]);

  await new Promise((resolve, reject) => {
    unavailableLegacy.once('error', reject);
    unavailableLegacy.listen(3099, '127.0.0.1', resolve);
  });
  startService(
    'passenger-auth-isolated',
    [
      'apps/passenger-web/node_modules/next/dist/bin/next',
      'start',
      'apps/passenger-web',
      '-p',
      '3010',
    ],
    {
      ...sharedWebEnv,
      API_URL: 'http://127.0.0.1:3099/api/v1',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3099/api/v1',
    },
  );
  await waitFor('passenger-auth-isolated', 'http://127.0.0.1:3010/login');
  const { runServerlessAuthJourney, runServerlessTransportJourney } =
    await import('../e2e/serverless-auth.mjs');
  await runServerlessAuthJourney('http://127.0.0.1:3010');
  await runServerlessTransportJourney('http://127.0.0.1:3010');
  if (rejectedLegacyRequests !== 0)
    throw new Error('Serverless auth/transport attempted a legacy API request.');

  const { runCriticalJourneys } = await import('../e2e/critical-journeys.mjs');
  await runCriticalJourneys({ headed: process.argv.includes('--headed') });
  startService(
    'driver-isolated',
    ['apps/driver-web/node_modules/next/dist/bin/next', 'start', 'apps/driver-web', '-p', '3011'],
    {
      ...sharedWebEnv,
      API_URL: 'http://127.0.0.1:3099/api/v1',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3099/api/v1',
      ABLY_API_KEY: '',
    },
  );
  await waitFor('driver-isolated', 'http://127.0.0.1:3011/login');
  const { runServerlessDriverRegression } = await import('../e2e/serverless-auth.mjs');
  await runServerlessDriverRegression('http://127.0.0.1:3011');
  if (rejectedLegacyRequests !== 0)
    throw new Error('Driver regression attempted a legacy API request.');
  exitCode = 0;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  cleanup();
}

process.exit(exitCode);
