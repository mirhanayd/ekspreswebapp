import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * maplibre-gl 6 starts its worker from `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
 * A bundled build turns that into a file: URL, so the worker never starts and the map only paints
 * its background. The worker and its shared chunk are therefore served as static files and the
 * app points maplibre at them with setWorkerUrl().
 */
const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maplibre');

await mkdir(target, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  await copyFile(join(dist, file), join(target, file));
}
