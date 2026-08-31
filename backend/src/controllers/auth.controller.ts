import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  signPreAuthToken,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashToken,
  generateTokenId,
  REFRESH_TTL_MS,
  type RefreshTokenPayload,
} from '../lib/auth.js';
import { Paso2SelectEmpresaSchema } from '../domain/auth.js';
import {
  setAccessCookie,
  setRefreshCookie,
  clearSessionCookie,
  getAccessTokenFromReq,
  getRefreshTokenFromReq,
} from '../lib/cookies.js';

// Hash dummy constante para mitigar timing attacks (prevencion de enumeracion de usuarios)
const DUMMY_HASH = '$2a$10$e7qJtq986P4m20w8.H44u.Sg3P/j2Vv7xX3N8g9f.e/W1b2c3d4e5';

const loginSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(1).max(100),
});

function clientMeta(req: Request): { userAgent?: string; ip?: string } {
  return {
    userAgent: req.headers['user-agent']?.toString().slice(0, 250),
    ip: req.ip || req.socket.remoteAddress || undefined,
  };
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ success: false, data: null, error: 'Credenciales con formato invalido' });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  try {
    const user = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      include: {
        usuarioEmpresas: {
          where: { activo: true },
          include: { empresa: true },
        },
      },
    });

    const passwordHash = user ? user.password : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(parsed.data.password, passwordHash);

    if (!user || !user.activo || !isPasswordValid) {
      return res.status(401).json({ success: false, data: null, error: 'Correo o contrasena incorrectos' });
    }

    const preAuthToken = signPreAuthToken(user.id);
    const empresasAsignadas = user.usuarioEmpresas
      .filter((item) => item.empresa.activo)
      .map((item) => ({ id: item.empresa.id, nombre: item.empresa.nombre }));

    if (empresasAsignadas.length === 0) {
      return res.status(403).json({ success: false, data: null, error: 'El usuario no tiene empresas asignadas activas' });
    }

    const hasMaster = user.usuarioEmpresas.some((item) => item.rol === 'MASTER');
    const hasAdmin = user.usuarioEmpresas.some((item) => item.rol === 'ADMIN');
    const rolGlobal = hasMaster ? 'MASTER' : hasAdmin ? 'ADMIN' : 'VENDEDOR';

    return res.json({
      success: true,
      data: {
        preAuthToken,
        user: { id: user.id, nombre: user.nombre, email: user.email, rolGlobal },
        empresasAsignadas,
      },
      error: '',
    });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible iniciar sesion' });
  }
}

export async function selectContext(req: Request, res: Response) {
  const parsed = Paso2SelectEmpresaSchema.safeParse(req.body);
  const token = getAccessTokenFromReq(req) || (req.body?.preAuthToken as string | undefined);
  if (!parsed.success || !token) {
    return res.status(400).json({ success: false, data: null, error: 'Contexto invalido' });
  }

  try {
    const payload = verifyToken(token);
    if (payload.tokenType !== 'PRE_AUTH') {
      return res.status(400).json({ success: false, data: null, error: 'El contexto ya fue seleccionado o token invalido' });
    }

    const access = await prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: payload.userId, empresaId: parsed.data.empresaId, activo: true },
      include: { empresa: true },
    });

    if (!access?.empresa.activo) {
      return res.status(403).json({ success: false, data: null, error: 'Sin acceso a la empresa seleccionada' });
    }

    const rol = access.rol === 'MASTER' ? 'MASTER' : access.rol === 'ADMIN' ? 'ADMIN' : 'VENDEDOR';

    // Crear access + refresh + familia
    const accessToken = signAccessToken(payload.userId, access.empresaId, rol);
    const refreshRecord = await prisma.refreshToken.create({
      data: {
        tokenHash: 'pending', // se actualiza tras firmar
        familiaId: generateTokenId(),
        userId: payload.userId,
        tenantId: access.empresaId,
        rol,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ...clientMeta(req),
      },
    });
    const refreshToken = signRefreshToken({
      jti: refreshRecord.id,
      userId: payload.userId,
      tenantId: access.empresaId,
      rol,
      familiaId: refreshRecord.familiaId,
    });
    await prisma.refreshToken.update({
      where: { id: refreshRecord.id },
      data: { tokenHash: hashToken(refreshToken) },
    });

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      data: {
        token: accessToken,
        accessToken,
        refreshToken, // para clientes que prefieran guardarlo en memoria
        tenantId: access.empresaId,
        empresa: { id: access.empresa.id, nombre: access.empresa.nombre },
        rol,
      },
      error: '',
    });
  } catch {
    return res.status(401).json({ success: false, data: null, error: 'Sesion o token pre-autenticacion expirado' });
  }
}

export async function refresh(req: Request, res: Response) {
  const rawRefresh = getRefreshTokenFromReq(req) || (req.body?.refreshToken as string | undefined);
  if (!rawRefresh) {
    return res.status(401).json({ success: false, data: null, error: 'Refresh token requerido' });
  }

  try {
    // 1) Validar firma/expiracion del JWT
    const payload = verifyToken(rawRefresh) as RefreshTokenPayload;
    if (payload.tokenType !== 'REFRESH') {
      return res.status(401).json({ success: false, data: null, error: 'Token de tipo invalido' });
    }

    // 2) Buscar en BD por jti y comparar hash
    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.tokenHash !== hashToken(rawRefresh)) {
      // Posible reuso de un refresh robado. Revocar toda la familia.
      if (stored) {
        await prisma.refreshToken.updateMany({
          where: { familiaId: stored.familiaId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return res.status(401).json({ success: false, data: null, error: 'Refresh token invalido o reutilizado' });
    }

    if (stored.revokedAt) {
      // Reuso de un token ya revocado: revocar familia completa.
      await prisma.refreshToken.updateMany({
        where: { familiaId: stored.familiaId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return res.status(401).json({ success: false, data: null, error: 'Refresh token revocado' });
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ success: false, data: null, error: 'Refresh token expirado' });
    }

    // 3) Verificar que el usuario sigue activo y con acceso al tenant
    const user = await prisma.usuario.findUnique({ where: { id: stored.userId } });
    if (!user?.activo) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      return res.status(401).json({ success: false, data: null, error: 'Usuario inactivo' });
    }
    const access = await prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: stored.userId, empresaId: stored.tenantId, activo: true },
    });
    if (!access) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      return res.status(403).json({ success: false, data: null, error: 'Sin acceso a la empresa' });
    }

    // 4) Rotacion: crear nuevo par (access + refresh) y revocar el antiguo
    const rol = stored.rol as 'MASTER' | 'ADMIN' | 'VENDEDOR';
    const newAccessToken = signAccessToken(stored.userId, stored.tenantId, rol);
    const newRecord = await prisma.refreshToken.create({
      data: {
        tokenHash: 'pending',
        familiaId: stored.familiaId, // misma familia = misma cadena de login
        userId: stored.userId,
        tenantId: stored.tenantId,
        rol,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ...clientMeta(req),
      },
    });
    const newRefreshToken = signRefreshToken({
      jti: newRecord.id,
      userId: stored.userId,
      tenantId: stored.tenantId,
      rol,
      familiaId: stored.familiaId,
    });
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: newRecord.id },
        data: { tokenHash: hashToken(newRefreshToken) },
      }),
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedById: newRecord.id },
      }),
    ]);

    setAccessCookie(res, newAccessToken);
    setRefreshCookie(res, newRefreshToken);

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        token: newAccessToken,
        tenantId: stored.tenantId,
        rol,
      },
      error: '',
    });
  } catch {
    return res.status(401).json({ success: false, data: null, error: 'Refresh token invalido' });
  }
}

export async function me(req: Request, res: Response) {
  const token = getAccessTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
  }

  try {
    const payload = verifyToken(token);
    if (payload.tokenType !== 'ACCESS') {
      return res.status(401).json({ success: false, data: null, error: 'Token de sesion requerido' });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      include: {
        usuarioEmpresas: {
          where: { activo: true },
          include: { empresa: true },
        },
      },
    });

    if (!user || !user.activo) {
      return res.status(401).json({ success: false, data: null, error: 'Sesion invalida' });
    }

    const ctx = user.usuarioEmpresas.find((ue) => ue.empresaId === payload.tenantId);
    if (!ctx || !ctx.empresa.activo) {
      return res.status(403).json({ success: false, data: null, error: 'Sin acceso a la empresa activa' });
    }

    const hasMasterGlobal = user.usuarioEmpresas.some((ue) => ue.rol === 'MASTER');
    const hasAdminGlobal = user.usuarioEmpresas.some((ue) => ue.rol === 'ADMIN');
    const rolGlobal = hasMasterGlobal ? 'MASTER' : hasAdminGlobal ? 'ADMIN' : 'VENDEDOR';
    const rol = (ctx.rol === 'MASTER' ? 'MASTER' : ctx.rol === 'ADMIN' ? 'ADMIN' : 'VENDEDOR') as 'MASTER' | 'ADMIN' | 'VENDEDOR';

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, nombre: user.nombre, rolGlobal },
        tenantId: ctx.empresaId,
        tenantNombre: ctx.empresa.nombre,
        empresa: { id: ctx.empresa.id, nombre: ctx.empresa.nombre },
        rol,
      },
      error: '',
    });
  } catch {
    return res.status(401).json({ success: false, data: null, error: 'Sesion expirada' });
  }
}

export async function logout(req: Request, res: Response) {
  // Si viene refresh token, revocamos la familia completa.
  const rawRefresh = getRefreshTokenFromReq(req) || (req.body?.refreshToken as string | undefined);
  if (rawRefresh) {
    try {
      const payload = verifyToken(rawRefresh) as RefreshTokenPayload;
      if (payload.tokenType === 'REFRESH') {
        await prisma.refreshToken.updateMany({
          where: { familiaId: payload.fid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // ignoramos: igual limpiamos la cookie
    }
  }
  clearSessionCookie(res);
  return res.json({
    success: true,
    data: { message: 'Sesion cerrada exitosamente' },
    error: '',
  });
}
