import type { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyToken, type AccessTokenPayload } from '../lib/auth.js';
import { getAccessTokenFromReq } from '../lib/cookies.js';

export type RequestContext = AccessTokenPayload & { user: { id: string; nombre: string; activo: boolean } };

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
  } catch {
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



