import type { Request, Response } from 'express';
import { z } from 'zod';
import sql from 'mssql';
import { prisma } from '../lib/prisma.js';
import { getMasterOrAdminContext, getMasterContext } from '../middleware/auth.js';
import { syncEmpresasFromGrupo } from '../services/empresas.service.js';
import { logger } from '../lib/logger.js';
import { encrypt, isEncrypted } from '../lib/encryption.js';
import { buildProfitConfig, connectWithRetry } from '../lib/profitConnection.js';

const empresaSchema = z.object({
  nombre: z.string().min(1).max(100),
  rubro: z.string().max(100).optional().nullable(),
  rif: z.string().max(20).optional().nullable(),
  profitDbHost: z.string().max(100).optional().nullable(),
  profitDbName: z.string().max(100).optional().nullable(),
  profitDbUser: z.string().max(100).optional().nullable(),
  profitDbPassword: z.string().max(100).optional().nullable(),
  activo: z.boolean().default(true)
});

export async function list(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado para gestionar empresas' });
    }

    // MASTER ve todas, ADMIN solo las asignadas
    let where: any = {};
    if (context.rol === 'ADMIN') {
      const asignadas = await prisma.usuarioEmpresa.findMany({
        where: { usuarioId: context.userId, activo: true },
        select: { empresaId: true }
      });
      where = { id: { in: asignadas.map(a => a.empresaId) } };
    }

    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        rif: true,
        rubro: true,
        direccion: true,
        telefono: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        profitDbHost: true,
        profitDbName: true,
        profitDbUser: true,
      }
    });

    return res.json({
      success: true,
      data: empresas,
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al listar empresas');
    return res.status(500).json({ success: false, data: null, error: 'Error al listar empresas' });
  }
}

export async function get(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const id = req.params.id as string;

    // ADMIN solo puede ver empresas asignadas
    if (context.rol === 'ADMIN') {
      const access = await prisma.usuarioEmpresa.findFirst({
        where: { usuarioId: context.userId, empresaId: id, activo: true }
      });
      if (!access) {
        return res.status(403).json({ success: false, data: null, error: 'No tienes acceso a esta empresa' });
      }
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        rif: true,
        rubro: true,
        direccion: true,
        telefono: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        profitDbHost: true,
        profitDbName: true,
        profitDbUser: true,
      }
    });

    if (!empresa) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada' });
    }

    return res.json({
      success: true,
      data: empresa,
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al obtener empresa');
    return res.status(500).json({ success: false, data: null, error: 'Error al obtener empresa' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const parsed = empresaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, data: null, error: 'Datos inválidos' });
    }

    // Cifrar password de Profit antes de guardar
    const dataToCreate = {
      ...parsed.data,
      profitDbPassword: parsed.data.profitDbPassword
        ? (isEncrypted(parsed.data.profitDbPassword) ? parsed.data.profitDbPassword : encrypt(parsed.data.profitDbPassword))
        : null,
    };

    const empresa = await prisma.empresa.create({
      data: dataToCreate,
      select: {
        id: true,
        nombre: true,
        rif: true,
        rubro: true,
        direccion: true,
        telefono: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        profitDbHost: true,
        profitDbName: true,
        profitDbUser: true,
      }
    });

    return res.status(201).json({
      success: true,
      data: empresa,
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al crear empresa');
    return res.status(500).json({ success: false, data: null, error: 'Error al crear empresa' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const id = req.params.id as string;

    // ADMIN solo puede modificar empresas asignadas
    if (context.rol === 'ADMIN') {
      const access = await prisma.usuarioEmpresa.findFirst({
        where: { usuarioId: context.userId, empresaId: id, activo: true }
      });
      if (!access) {
        return res.status(403).json({ success: false, data: null, error: 'No tienes acceso a esta empresa' });
      }
    }

    const parsed = empresaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, data: null, error: 'Datos inválidos' });
    }

    const exists = await prisma.empresa.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada' });
    }

    // Cifrar password de Profit antes de guardar (solo si cambió)
    const dataToUpdate = {
      ...parsed.data,
      profitDbPassword: parsed.data.profitDbPassword
        ? (isEncrypted(parsed.data.profitDbPassword) ? parsed.data.profitDbPassword : encrypt(parsed.data.profitDbPassword))
        : parsed.data.profitDbPassword === null ? null : undefined,
    };

    const empresa = await prisma.empresa.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        nombre: true,
        rif: true,
        rubro: true,
        direccion: true,
        telefono: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        profitDbHost: true,
        profitDbName: true,
        profitDbUser: true,
      }
    });

    return res.json({
      success: true,
      data: empresa,
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al actualizar empresa');
    return res.status(500).json({ success: false, data: null, error: 'Error al actualizar empresa' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const id = req.params.id as string;

    // ADMIN solo puede eliminar empresas asignadas
    if (context.rol === 'ADMIN') {
      const access = await prisma.usuarioEmpresa.findFirst({
        where: { usuarioId: context.userId, empresaId: id, activo: true }
      });
      if (!access) {
        return res.status(403).json({ success: false, data: null, error: 'No tienes acceso a esta empresa' });
      }
    }

    const exists = await prisma.empresa.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada' });
    }

    await prisma.empresa.delete({ where: { id } });

    return res.json({
      success: true,
      data: { message: 'Empresa eliminada exitosamente' },
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al eliminar empresa');
    // Si falla por registros relacionados, la desactivamos en su lugar
    try {
      const id = req.params.id as string;
      await prisma.empresa.update({
        where: { id },
        data: { activo: false }
      });
      return res.json({
        success: true,
        data: { message: 'La empresa tiene registros asociados y no puede eliminarse físicamente, pero ha sido desactivada exitosamente.' },
        error: ''
      });
    } catch {
      return res.status(500).json({ success: false, data: null, error: 'Error al desactivar la empresa' });
    }
  }
}

export async function syncFromGrupo(req: Request, res: Response) {
  try {
    const context = await getMasterContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'Solo MASTER puede sincronizar empresas' });
    }

    const { grupoEmpresaId } = req.body;
    if (!grupoEmpresaId || typeof grupoEmpresaId !== 'string') {
      return res.status(400).json({ success: false, data: null, error: 'grupoEmpresaId es requerido' });
    }

    const result = await syncEmpresasFromGrupo(grupoEmpresaId);

    return res.json({
      success: true,
      data: result,
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al sincronizar empresas desde grupo');
    return res.status(500).json({ success: false, data: null, error: 'Error al sincronizar empresas' });
  }
}

export async function testConnection(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const empresaId = req.params.id as string;
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada' });
    }

    if (!empresa.profitDbHost || !empresa.profitDbName || !empresa.profitDbUser || !empresa.profitDbPassword) {
      return res.json({
        success: true,
        data: { ok: false, message: 'La empresa no tiene credenciales de Profit configuradas' },
        error: ''
      });
    }

    try {
      const config = buildProfitConfig(empresa);
      const pool = await connectWithRetry(config, { maxRetries: 1, delayMs: 3000 });
      await pool.close();
      return res.json({
        success: true,
        data: { ok: true, message: 'Conexión exitosa a Profit Plus' },
        error: ''
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      logger.warn({ err, empresaId }, 'Test de conexión fallido');
      return res.json({
        success: true,
        data: { ok: false, message: `No se pudo conectar: ${msg}` },
        error: ''
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Error al probar conexión');
    return res.status(500).json({ success: false, data: null, error: 'Error al probar conexión' });
  }
}

