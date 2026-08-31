// filepath: src/utils/rateLimit.ts
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';

const num = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isProd = process.env.NODE_ENV === 'production';

/**
 * Handler reutilizable para responder 429 en JSON consistente con el resto
 * de la API ({ success: false, data: null, error: '...' }).
 */
const jsonHandler = (req: Request, res: Response): void => {
  const retryAfter = res.getHeader('Retry-After');
  res.status(429).json({
    success: false,
    data: null,
    error: `Demasiadas solicitudes. Reintente en ${retryAfter ?? '60'} segundos.`,
  });
};

/**
 * Limitador GLOBAL: protege toda la API de scraping/DOS basico.
 * Por defecto: 300 req / 15 min por IP (ajustable por env).
 */
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: num(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 15 * 60 * 1000),
  max: num(process.env.RATE_LIMIT_GLOBAL_MAX, isProd ? 300 : 1000),
  standardHeaders: 'draft-7', // RateLimit / RateLimit-Policy (RFC)
  legacyHeaders: false,
  handler: jsonHandler,
  skip: (req) => req.method === 'OPTIONS', // no contar preflights
});

/**
 * Limitador ESTRICTO para endpoints sensibles (login, refresh, etc).
 * Por defecto: 10 req / 15 min por IP.
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: num(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
  max: num(process.env.RATE_LIMIT_AUTH_MAX, 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Log de auditoria al arrancar el servidor.
 */
export const logRateLimitSummary = (): void => {
  console.log(
    `[RateLimit] Global: ${process.env.RATE_LIMIT_GLOBAL_MAX ?? (isProd ? 300 : 1000)} req / ${
      process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? 900_000
    }ms`,
  );
  console.log(
    `[RateLimit] Auth:   ${process.env.RATE_LIMIT_AUTH_MAX ?? 10} req / ${
      process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? 900_000
    }ms`,
  );
};
