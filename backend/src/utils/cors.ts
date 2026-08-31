// filepath: src/utils/cors.ts
import cors, { type CorsOptions } from 'cors';

/**
 * Lista de origenes permitidos por CORS.
 * Se resuelve desde la variable de entorno CORS_ORIGINS (CSV).
 * Formatos aceptados:
 *   - URL exacta:  "https://app.tu-dominio.com"
 *   - Subdominios: "*.tu-dominio.com"  -> coincide con cualquier subdominio
 *   - Wildcard:    "*"                 -> permite todos (solo dev)
 */
const rawOrigins = process.env.CORS_ORIGINS ?? '';
const allowAllOrigins = rawOrigins.trim() === '*';

const allowedOrigins = allowAllOrigins
  ? []
  : rawOrigins
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

if (!allowAllOrigins && allowedOrigins.length === 0) {
  console.warn(
    '[CORS] No se definieron origenes en CORS_ORIGINS. Solo se permitiran mismas-origen (same-origin).',
  );
}

/**
 * Determina si un origen puede consumir la API.
 * - Si CORS_ORIGINS="*", todo pasa.
 * - Si no hay origen en la peticion (curl, server-to-server) se rechaza.
 * - Se valida contra la lista exacta o contra comodines "*.dominio.com".
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (allowAllOrigins) return true;
  if (!origin) return false;
  if (allowedOrigins.length === 0) return false;

  if (allowedOrigins.includes(origin)) return true;

  return allowedOrigins.some((allowed) => {
    if (!allowed.startsWith('*.')) return false;
    const suffix = allowed.slice(1); // ".tu-dominio.com"
    try {
      const { host } = new URL(origin);
      return host.endsWith(suffix) && host !== suffix.slice(1);
    } catch {
      return false;
    }
  });
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin ?? '(sin origen)'}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 600, // 10 min de cache del preflight
};

export const corsMiddleware = cors(corsOptions);

/** Log de auditoria al arrancar el servidor. */
export const logCorsSummary = (): void => {
  if (allowAllOrigins) {
    console.log('[CORS] ADVERTENCIA: todos los origenes estan permitidos (CORS_ORIGINS="*").');
  } else {
    console.log(`[CORS] Origenes permitidos: ${allowedOrigins.join(', ') || '(ninguno)'}`);
  }
};
