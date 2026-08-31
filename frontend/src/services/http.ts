// filepath: src/services/http.ts
// Instancia axios unica con:
//   - baseURL configurable por VITE_API_BASE_URL
//   - withCredentials: true -> envia cookies httpOnly (crm_token / crm_refresh)
//   - interceptor de respuesta: 401 -> /auth/refresh una vez -> reintento
//   - deduplicacion del flight de refresh (varios 401s -> un solo /refresh)
//   - emisor de eventos para que el store de auth limpie sesion al expirar

import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { ApiError } from '../domain/api';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:4500` : 'http://localhost:4500');

export const http: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

/** Endpoints que NO deben disparar refresh automatico. */
const SKIP_REFRESH_PATHS = ['/api/auth/login', '/api/auth/context', '/api/auth/refresh', '/api/auth/logout'];

type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

export function onSessionExpired(cb: Listener): () => void {
  sessionExpiredListeners.add(cb);
  return () => sessionExpiredListeners.delete(cb);
}

function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
}

let refreshFlight: Promise<boolean> | null = null;

async function callRefresh(): Promise<boolean> {
  try {
    // No usamos `http` aqui para evitar recursion de interceptors.
    await axios.post(
      `${baseURL}/api/auth/refresh`,
      {},
      { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
    );
    return true;
  } catch {
    return false;
  } finally {
    // Permitir un nuevo flight la proxima vez.
    setTimeout(() => {
      refreshFlight = null;
    }, 0);
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshFlight) refreshFlight = callRefresh();
  return refreshFlight;
}

/**
 * Marca esta peticion como "no pasar por el refresh automatico".
 * Util en endpoints publicos (/auth/login) o cuando se quiere manejar
 * el 401 a mano.
 */
export function skipRefresh<T = unknown>(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return { ...config, _skipRefresh: true as never };
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    _skipRefresh?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _skipRefresh?: boolean;
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _skipRefresh?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._skipRefresh) {
      const refreshed = await refreshOnce();
      if (refreshed) {
        try {
          return await http.request(original);
        } catch (retryError) {
          // El segundo intento tambien fallo: cae al error generico.
          throw normalizeError(retryError);
        }
      }
      // Refresh agotado: avisar al store y propagar.
      notifySessionExpired();
    }

    throw normalizeError(error);
  },
);

function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as { error?: string; success?: boolean } | undefined;
    const message =
      (typeof data?.error === 'string' && data.error) ||
      err.message ||
      `Error HTTP ${status}`;
    return new ApiError(message, status, err.response?.data);
  }
  if (err instanceof Error) return new ApiError(err.message, 0);
  return new ApiError('Error desconocido', 0);
}

export function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) return false;
  return SKIP_REFRESH_PATHS.some((p) => url.includes(p));
}
