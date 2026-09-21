export { createDatabaseClient } from './client.js';
export * as schema from './schema/index.js';
export { validateConfig, type DatabaseConfig } from './config.js';
export * from './server/driver-backend.js';
export * from './server/auth.js';
export { ServerError } from './server/errors.js';
export { authService, createAuthService, validateAuthInput } from './server/auth-service.js';
