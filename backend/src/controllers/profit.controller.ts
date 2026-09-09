import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getMasterOrAdminContext } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import {
  syncAllForEmpresa,
  syncClientesForEmpresa,
  syncSellersForEmpresa,
  syncVentasForEmpresa,
  testConect,
  type SyncResult
} from '../services/profitSync.service.js';

/**
 * Compacta un SyncResult interno al contrato que consume el frontend
 * (ProfitSyncResult: { success, empresa?, inserted?, updated?, error? }).
 */
function toFrontendShape(r: SyncResult) {
  return {
    success: r.ok,
    empresa: r.empresa,
    inserted: r.stats?.inserted,
    updated: r.stats?.updated,
    skipped: r.stats?.skipped,
    errors: r.stats?.errors,
    read: r.stats?.read,
    error: r.error
  };
}

/**
 * Sincronización completa (vendedores -> clientes -> ventas).
 * Devuelve { message, clientes, ventas } para mantener compatibilidad con el frontend.
 */
export async function syncAll(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body ?? {};
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    if (empresaId && empresas.length === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada o inactiva' });
    }

    const all: any[] = [];
    for (const emp of empresas) {
      all.push(await syncAllForEmpresa(emp));
    }

    const clientes = all.map((r) => toFrontendShape(r.clientes));
    const ventas = all.map((r) => toFrontendShape(r.ventas));
    const ok = all.every((r) => r.ok);

    return res.json({
      success: true,
      data: {
        message: ok
          ? 'Sincronización completa con Profit Plus ejecutada'
          : 'Sincronización completada con errores parciales',
        clientes,
        ventas
      },
      error: ok ? '' : 'La sincronización general presentó errores en algunas empresas'
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en sincronización general con Profit');
    return res.status(500).json({ success: false, data: null, error: 'Error al ejecutar sincronización con Profit' });
  }
}

/**
 * Sincroniza únicamente vendedores de la(s) empresa(s) indicada(s).
 */
export async function syncSellers(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body ?? {};
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    if (empresaId && empresas.length === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada o inactiva' });
    }

    const results: ReturnType<typeof toFrontendShape>[] = [];
    for (const emp of empresas) {
      const r = await syncSellersForEmpresa(emp);
      results.push(toFrontendShape(r));
    }
    const ok = results.every((r) => r.success);
    return res.json({ success: true, data: { message: ok ? 'Sincronización de vendedores' : 'Sincronización de vendedores con errores', results }, error: ok ? '' : 'Algunas empresas presentaron errores' });
  } catch (error) {
    logger.error({ err: error }, 'Error en sincronización de vendedores');
    return res.status(500).json({ success: false, data: null, error: 'Error al sincronizar vendedores' });
  }
}

/**
 * Sincroniza únicamente clientes de la(s) empresa(s) indicada(s).
 */
export async function syncClientes(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body ?? {};
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    if (empresaId && empresas.length === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada o inactiva' });
    }

    const results: ReturnType<typeof toFrontendShape>[] = [];
    for (const emp of empresas) {
      const r = await syncClientesForEmpresa(emp);
      results.push(toFrontendShape(r));
    }
    const ok = results.every((r) => r.success);
    return res.json({ success: true, data: { message: ok ? 'Sincronización de clientes' : 'Sincronización de clientes con errores', results }, error: ok ? '' : 'Algunas empresas presentaron errores' });
  } catch (error) {
    logger.error({ err: error }, 'Error en sincronización de clientes');
    return res.status(500).json({ success: false, data: null, error: 'Error al sincronizar clientes' });
  }
}

/**
 * Sincroniza únicamente ventas (últimos 9 meses móviles) de la(s) empresa(s).
 */
export async function syncVentas(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body ?? {};
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    if (empresaId && empresas.length === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada o inactiva' });
    }

    const results: ReturnType<typeof toFrontendShape>[] = [];
    for (const emp of empresas) {
      const r = await syncVentasForEmpresa(emp);
      results.push(toFrontendShape(r));
    }
    const ok = results.every((r) => r.success);
    return res.json({ success: true, data: { message: ok ? 'Sincronización de ventas' : 'Sincronización de ventas con errores', results }, error: ok ? '' : 'Algunas empresas presentaron errores' });
  } catch (error) {
    logger.error({ err: error }, 'Error en sincronización de ventas');
    return res.status(500).json({ success: false, data: null, error: 'Error al sincronizar ventas' });
  }
}

export async function getStatus(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const empresas = await prisma.empresa.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, profitDbUser: true, updatedAt: true }
    });

    return res.json({
      success: true,
      data: empresas.map(e => ({
        ...e,
        configured: Boolean(e.profitDbUser),
        lastSync: e.updatedAt
      })),
      error: ''
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al obtener estado Profit');
    return res.status(500).json({ success: false, data: null, error: 'Error al obtener estado' });
  }
}

export async function testConectDB(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body;
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada' });
    }

    const data = await testConect(empresa);
    return res.json({ success: true, data: data, error: '' });
  } catch (error) {
    logger.error({ err: error }, 'Error al probar conexión con Profit');
    return res.status(500).json({ success: false, data: null, error: 'Error al probar conexión con Profit' });
  }
}