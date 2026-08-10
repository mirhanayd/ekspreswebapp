import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function main() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  let cursor = '0';
  let removed = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'tracking:latest:*', 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) removed += await redis.del(...keys);
  } while (cursor !== '0');
  await redis.quit();
  console.log(`Tracking demo state reset (${removed} latest-position keys removed).`);
}

main().catch((error: Error) => {
  console.error(`Tracking reset failed: ${error.message}`);
  process.exit(1);
});
