import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyToken, type AccessTokenPayload } from '../lib/auth.js';
import { getAccessTokenFromReq } from '../lib/cookies.js';
import { logger } from '../lib/logger.js';

export type RequestContext = AccessTokenPayload & { user: { id: string; nombre: string; activo: boolean } };

// Extender el tipo Request de Express para incluir context
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

export async function getRequestContext(req: Request): Promise<RequestContext | null> {
  const token = getAccessTokenFromReq(req);
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (payload.tokenType !== 'ACCESS') return null;

    const user = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: { id: true, nombre: true, activo: true }
    });

    const access = await prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: payload.userId, empresaId: payload.tenantId, activo: true }
    });

    if (!user?.activo || !access) return null;
    return { ...payload, user };
  } catch (err) {
    logger.error({ err }, '[auth] Error verificando token');
    return null;
  }
}

export async function getMasterOrAdminContext(req: Request): Promise<RequestContext | null> {
  const context = await getRequestContext(req);
  if (!context) return null;
  if (context.rol !== 'MASTER' && context.rol !== 'ADMIN') return null;
  return context;
}

export async function getMasterContext(req: Request): Promise<RequestContext | null> {
  const context = await getRequestContext(req);
  if (!context) return null;
  if (context.rol !== 'MASTER') return null;
  return context;
}

/**
 * Middleware que verifica autenticación y adjunta el contexto a req.context.
 * Uso: router.get('/', requireAuth, handler)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getRequestContext(req).then((context) => {
    if (!context) {
      res.status(401).json({ success: false, data: null, error: 'No autenticado' });
      return;
    }
    req.context = context;
    next();
  }).catch(() => {
    res.status(401).json({ success: false, data: null, error: 'No autenticado' });
  });
}

/**
 * Middleware que verifica que el usuario sea MASTER o ADMIN.
 * Uso: router.post('/', requireMasterOrAdmin, handler)
 */
export function requireMasterOrAdmin(req: Request, res: Response, next: NextFunction): void {
  getMasterOrAdminContext(req).then((context) => {
    if (!context) {
      res.status(403).json({ success: false, data: null, error: 'No autorizado' });
      return;
    }
    req.context = context;
    next();
  }).catch(() => {
    res.status(403).json({ success: false, data: null, error: 'No autorizado' });
  });
}

/**
 * Middleware que verifica que el usuario sea MASTER.
 * Uso: router.post('/', requireMaster, handler)
 */
export function requireMaster(req: Request, res: Response, next: NextFunction): void {
  getMasterContext(req).then((context) => {
    if (!context) {
      res.status(403).json({ success: false, data: null, error: 'Solo usuarios MASTER pueden realizar esta acción' });
      return;
    }
    req.context = context;
    next();
  }).catch(() => {
    res.status(403).json({ success: false, data: null, error: 'No autorizado' });
  });
}
