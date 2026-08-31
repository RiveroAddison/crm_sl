import type { Request, Response } from 'express';
import { z } from 'zod';
import sql from 'mssql';
import { prisma } from '../lib/prisma.js';
import { getMasterOrAdminContext } from '../middleware/auth.js';

const empresaSchema = z.object({
  nombre: z.string().min(1).max(100),
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

    const empresas = await prisma.empresa.findMany({
      orderBy: { nombre: 'asc' }
    });

    return res.json({
      success: true,
      data: empresas,
      error: ''
    });
  } catch (error) {
    console.error('Error al listar empresas:', error);
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
    const empresa = await prisma.empresa.findUnique({
      where: { id }
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
    console.error('Error al obtener empresa:', error);
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

    const empresa = await prisma.empresa.create({
      data: parsed.data
    });

    return res.status(201).json({
      success: true,
      data: empresa,
      error: ''
    });
  } catch (error) {
    console.error('Error al crear empresa:', error);
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
    const parsed = empresaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, data: null, error: 'Datos inválidos' });
    }

    const exists = await prisma.empresa.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ success: false, data: null, error: 'Empresa no encontrada' });
    }

    const empresa = await prisma.empresa.update({
      where: { id },
      data: parsed.data
    });

    return res.json({
      success: true,
      data: empresa,
      error: ''
    });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
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
    console.error('Error al eliminar empresa:', error);
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

export async function testConnection(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { host, name, user, password } = req.body;
    if (!host || !name || !user || !password) {
      return res.status(400).json({ success: false, data: null, error: 'Faltan parámetros de conexión' });
    }

    const config: sql.config = {
      server: host,
      database: name,
      user: user,
      password: password,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };

    const pool = await new sql.ConnectionPool(config).connect();
    await pool.close();

    return res.json({
      success: true,
      data: { connected: true, message: '¡Conexión exitosa a la base de datos de Profit!' },
      error: ''
    });
  } catch (error: any) {
    console.warn('Error al probar conexión Profit:', error.message);
    return res.json({
      success: true,
      data: { connected: false, message: `No se pudo conectar a Profit: ${error.message}` },
      error: ''
    });
  }
}

