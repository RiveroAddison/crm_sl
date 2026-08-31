import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const configuredSecret = process.env.JWT_SECRET;
const configuredRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (!configuredSecret || configuredSecret === 'replace-with-a-long-random-secret') {
  console.warn('[SECURITY WARNING] JWT_SECRET utiliza una clave predeterminada o no configurada.');
}
if (!configuredRefreshSecret || configuredRefreshSecret === 'replace-with-a-long-random-secret') {
  console.warn(
    '[SECURITY WARNING] JWT_REFRESH_SECRET no configurado. Usando fallback; DEFINA UNO FUERTE en produccion.',
  );
}

const jwtSecret: string = configuredSecret || 'default-fallback-secret-key-change-in-prod';
const jwtRefreshSecret: string =
  configuredRefreshSecret || 'default-refresh-fallback-secret-key-change-in-prod';

// TTLs configurables por env. Defaults razonables para una API de gestion.
const ACCESS_TTL_RAW = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL_RAW = process.env.REFRESH_TOKEN_TTL || '7d';
// jsonwebtoken@9 acepta expiresIn como numero (segundos) o string tipo "15m".
// Pasamos segundos para evitar friccion con la tipificacion de StringValue.
const ACCESS_TTL_SECONDS = Math.max(60, Math.floor(parseDuration(ACCESS_TTL_RAW) / 1000));
const REFRESH_TTL_SECONDS = Math.max(3600, Math.floor(parseDuration(REFRESH_TTL_RAW) / 1000));
export const REFRESH_TTL_MS = REFRESH_TTL_SECONDS * 1000;

/** Tipos discriminados de payload por tipo de token. */
export type PreAuthTokenPayload = {
  userId: string;
  tokenType: 'PRE_AUTH';
};

export type AccessTokenPayload = {
  userId: string;
  tenantId: string;
  rol: string;
  tokenType: 'ACCESS';
};

export type RefreshTokenPayload = {
  // jti (jwt id) = id del registro RefreshToken (permite revocacion por BD).
  jti: string;
  userId: string;
  tenantId: string;
  rol: string;
  // fid = familia (para detectar reuso y revocar toda la cadena).
  fid: string;
  tokenType: 'REFRESH';
};

export type ContextToken = PreAuthTokenPayload | AccessTokenPayload | RefreshTokenPayload;

/** Token temporal (Paso 1) - 15 min, sin tenant. */
export function signPreAuthToken(userId: string): string {
  const payload: PreAuthTokenPayload = { userId, tokenType: 'PRE_AUTH' };
  return jwt.sign(payload, jwtSecret, { expiresIn: 15 * 60 });
}

/** Access token de sesión - corto (15m por defecto). */
export function signAccessToken(userId: string, tenantId: string, rol: string): string {
  const payload: AccessTokenPayload = { userId, tenantId, rol, tokenType: 'ACCESS' };
  return jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TTL_SECONDS });
}

/** Refresh token - largo (7d por defecto), con jti y familia. */
export function signRefreshToken(args: {
  jti: string;
  userId: string;
  tenantId: string;
  rol: string;
  familiaId: string;
}): string {
  const payload: RefreshTokenPayload = {
    jti: args.jti,
    userId: args.userId,
    tenantId: args.tenantId,
    rol: args.rol,
    fid: args.familiaId,
    tokenType: 'REFRESH',
  };
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: REFRESH_TTL_SECONDS });
}

/** Verifica un token contra el secreto adecuado según su tipo. */
export function verifyToken(token: string): ContextToken {
  // Decodificamos sin verificar para conocer el tipo y elegir el secreto.
  const decoded = jwt.decode(token) as ContextToken | null;
  if (!decoded || !decoded.tokenType) {
    throw new Error('Token sin tipo reconocido');
  }
  const secret = decoded.tokenType === 'REFRESH' ? jwtRefreshSecret : jwtSecret;
  return jwt.verify(token, secret) as ContextToken;
}

/** Hash SHA-256 de un token, en hex. Usado para almacenar/consultar el refresh token. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Genera un id opaco para usar como jti / familia. */
export function generateTokenId(): string {
  return crypto.randomBytes(24).toString('hex');
}

/** Parsea duraciones tipo "15m", "7d", "1h" a milisegundos. */
function parseDuration(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(input.trim());
  if (!match) {
    console.warn(`[AUTH] Duracion invalida "${input}", usando 7d por defecto.`);
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

/** Helper legacy de compatibilidad. */
export function signSessionToken(userId: string, tenantId: string, rol: string): string {
  return signAccessToken(userId, tenantId, rol);
}

/** Helper legacy de compatibilidad. */
export function signContextToken(payload: { userId: string; tenantId: string; rol: string }): string {
  if (payload.tenantId === 'pending') {
    return signPreAuthToken(payload.userId);
  }
  return signAccessToken(payload.userId, payload.tenantId, payload.rol);
}

/** Helper legacy de compatibilidad. */
export function verifyContextToken(token: string): ContextToken {
  return verifyToken(token);
}

