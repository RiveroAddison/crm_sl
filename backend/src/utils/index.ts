// filepath: src/utils/index.ts
// Barrel export para reglas transversales (CORS, helmet, rate-limit, etc.).

// CORS
export { corsMiddleware, corsOptions, isOriginAllowed, logCorsSummary } from './cors.js';
export { corsErrorHandler } from './corsErrorHandler.js';

// Helmet (cabeceras de seguridad)
export { helmetMiddleware, stripInfoHeaders } from './helmet.js';

// Rate limiting
export {
  globalRateLimiter,
  authRateLimiter,
  logRateLimitSummary,
} from './rateLimit.js';

