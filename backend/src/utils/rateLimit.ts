// filepath: src/utils/rateLimit.ts
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logger } from '../lib/logger.js';

const num = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isProd = process.env.NODE_ENV === 'production';

// Intentar conectar a Redis para rate limiting persistente
let redisStore: any = null;
const redisUrl = process.env.REDIS_URL;

async function initRedisStore(): Promise<void> {
  if (!redisUrl) {
    logger.info('[RateLimit] Redis no configurado (REDIS_URL). Usando memoria in-memory.');
    return;
  }

  try {
    const { Redis } = await import('ioredis');
    const { RedisStore } = await import('rate-limit-redis');

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('[RateLimit] Redis no disponible, fallback a memoria.');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    client.on('error', (err) => {
      logger.warn({ err }, '[RateLimit] Redis error, fallback a memoria.');
    });

    client.on('connect', () => {
      logger.info('[RateLimit] Redis conectado. Rate limiting persistente activo.');
    });

    redisStore = new RedisStore({
      sendCommand: (...args: string[]) => client.call(...args as [string, ...string[]]),
    } as any);
  } catch (err) {
    logger.warn({ err }, '[RateLimit] No se pudo cargar ioredis/rate-limit-redis. Usando memoria.');
  }
}

// Inicializar Redis de forma asíncrona al cargar el módulo
initRedisStore();

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
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
  skip: (req) => req.method === 'OPTIONS',
  store: redisStore,
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
  store: redisStore,
});

/**
 * Log de auditoria al arrancar el servidor.
 */
export const logRateLimitSummary = (): void => {
  const storeType = redisStore ? 'Redis (persistente)' : 'Memoria (in-memory)';
  logger.info(
    `[RateLimit] Store: ${storeType}`,
  );
  logger.info(
    `[RateLimit] Global: ${process.env.RATE_LIMIT_GLOBAL_MAX ?? (isProd ? 300 : 1000)} req / ${
      process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? 900_000
    }ms`,
  );
  logger.info(
    `[RateLimit] Auth:   ${process.env.RATE_LIMIT_AUTH_MAX ?? 10} req / ${
      process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? 900_000
    }ms`,
  );
};
