import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getMasterOrAdminContext } from '../middleware/auth.js';
import { syncClientesForEmpresa, syncVentasForEmpresa, testConect } from '../services/profitSync.service.js';

export async function syncClientes(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body;
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    if (empresas.length === 0) {
      return res.status(404).json({ success: false, data: null, error: 'No se encontraron empresas activas para sincronizar' });
    }

    const results: any[] = [];
    for (const emp of empresas) {
      try {
        const resSync = await syncClientesForEmpresa(emp);
        results.push({ success: true, ...resSync });
      } catch (err: any) {
        results.push({ empresa: emp.nombre, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      data: { message: 'Sincronización de clientes completada', results },
      error: ''
    });
  } catch (error) {
    console.error('Error al sincronizar clientes con Profit:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al sincronizar clientes con Profit' });
  }
}

export async function syncVentas(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body;
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    if (empresas.length === 0) {
      return res.status(404).json({ success: false, data: null, error: 'No se encontraron empresas activas para sincronizar' });
    }

    const results: any[] = [];
    for (const emp of empresas) {
      try {
        const resSync = await syncVentasForEmpresa(emp);
        results.push({ success: true, ...resSync });
      } catch (err: any) {
        results.push({ empresa: emp.nombre, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      data: { message: 'Sincronización de ventas y facturación completada', results },
      error: ''
    });
  } catch (error) {
    console.error('Error al sincronizar ventas con Profit:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al sincronizar ventas con Profit' });
  }
}

export async function syncAll(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.body;
    const empresas = empresaId
      ? await prisma.empresa.findMany({ where: { id: empresaId, activo: true } })
      : await prisma.empresa.findMany({ where: { activo: true } });

    const clientesResults: any[] = [];
    const ventasResults: any[] = [];

    for (const emp of empresas) {
      try {
        const resC = await syncClientesForEmpresa(emp);
        clientesResults.push({ success: true, ...resC });
      } catch (err: any) {
        clientesResults.push({ empresa: emp.nombre, success: false, error: err.message });
      }

      try {
        const resV = await syncVentasForEmpresa(emp);
        ventasResults.push({ success: true, ...resV });
      } catch (err: any) {
        ventasResults.push({ empresa: emp.nombre, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      data: {
        message: 'Sincronización completa con Profit Plus (MSSQL) ejecutada',
        clientes: clientesResults,
        ventas: ventasResults
      },
      error: ''
    });
  } catch (error) {
    console.error('Error en sincronización general con Profit:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al ejecutar sincronización con Profit' });
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
      select: { id: true, nombre: true, profitDbHost: true, profitDbName: true, updatedAt: true }
    });

    return res.json({
      success: true,
      data: empresas.map(e => ({
        ...e,
        configured: Boolean(e.profitDbHost && e.profitDbName),
        lastSync: e.updatedAt
      })),
      error: ''
    });
  } catch (error) {
    console.error('Error al obtener estado Profit:', error);
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
    console.error('Error al probar conexión con Profit:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al probar conexión con Profit' });
  }
}