// filepath: src/utils/helmet.ts
import helmet from 'helmet';
import type { Request, Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Helmet configura por defecto las cabeceras de seguridad mas importantes:
 *  - Content-Security-Policy (CSP)
 *  - Strict-Transport-Security (HSTS)
 *  - X-Content-Type-Options: nosniff
 *  - X-Frame-Options: SAMEORIGIN
 *  - Referrer-Policy: no-referrer
 *  - Cross-Origin-Opener-Policy
 *  - Cross-Origin-Resource-Policy
 *  - X-DNS-Prefetch-Control: off
 *  - Oculta X-Powered-By
 *
 *  La CSP se relaja en desarrollo para que Vite/Swagger UI funcionen
 *  sin warnings; en produccion queda estricta.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: isProd
    ? {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // swagger-ui requiere inline styles
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
        },
      }
    : false,
  crossOriginEmbedderPolicy: isProd,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  noSniff: true,
  xssFilter: true,
});

/**
 * Middleware ligero que elimina cabeceras que delatan tecnologias del backend.
 * Complementa a Helmet por si algun proxy upstream las reinyecta.
 */
export const stripInfoHeaders = (_req: Request, res: Response, next: () => void): void => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
};
