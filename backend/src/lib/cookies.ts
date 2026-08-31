import type { Request, Response } from 'express';

export const ACCESS_COOKIE = 'crm_token';
export const REFRESH_COOKIE = 'crm_refresh';

// TTLs por defecto; deben coincidir (o ser ligeramente menores) que los del JWT.
const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 min
const REFRESH_TTL_MS_DEFAULT = 7 * 24 * 60 * 60 * 1000; // 7 d

function refreshTtlMs(): number {
  const raw = process.env.REFRESH_TOKEN_TTL || '7d';
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(raw.trim());
  if (!match) return REFRESH_TTL_MS_DEFAULT;
  const n = Number(match[1]);
  switch (match[2].toLowerCase()) {
    case 'ms': return n;
    case 's':  return n * 1000;
    case 'm':  return n * 60 * 1000;
    case 'h':  return n * 60 * 60 * 1000;
    case 'd':  return n * 24 * 60 * 60 * 1000;
    default:   return REFRESH_TTL_MS_DEFAULT;
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  for (const cookie of cookieHeader.split(';')) {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      list[name] = decodeURIComponent(val);
    }
  }
  return list;
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setAccessCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseCookieOptions,
    maxAge: ACCESS_TTL_MS,
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseCookieOptions,
    // La cookie de refresh debe sobrevivir al cierre del navegador.
    maxAge: refreshTtlMs(),
  });
}

export function setSessionCookie(res: Response, accessToken: string, refreshToken?: string): void {
  setAccessCookie(res, accessToken);
  if (refreshToken) setRefreshCookie(res, refreshToken);
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions });
}

export function getAccessTokenFromReq(req: Request): string | null {
  const cookies = parseCookies(req);
  if (cookies[ACCESS_COOKIE]) return cookies[ACCESS_COOKIE];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function getRefreshTokenFromReq(req: Request): string | null {
  const cookies = parseCookies(req);
  return cookies[REFRESH_COOKIE] ?? null;
}

/** Compatibilidad: el codigo antiguo leía "crm_token" (access). */
export function getSessionTokenFromReq(req: Request): string | null {
  return getAccessTokenFromReq(req);
}
