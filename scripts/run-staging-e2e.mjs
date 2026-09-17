import { runCriticalJourneys } from '../e2e/critical-journeys.mjs';

const required = ['PASSENGER_BASE_URL', 'ADMIN_BASE_URL', 'DRIVER_BASE_URL', 'API_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing staging E2E environment variables: ${missing.join(', ')}`);
}

await runCriticalJourneys({ headed: process.argv.includes('--headed') });
