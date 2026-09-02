import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getRequestContext } from '../middleware/auth.js';

export async function getDashboard(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const clients = await prisma.clienteEmpresa.findMany({ where: { empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) }, include: { clienteCorporativo: { include: { crossSellingMatriz: true } }, visitas: true, ventas: { orderBy: { fecha: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
    const activeClients = clients.filter((client) => client.estado === 'ACTIVO').length;
    const crossSelling = clients.filter((client) => { const matrix = client.clienteCorporativo.crossSellingMatriz; return matrix && [matrix.combustible, matrix.lubricantes, matrix.autopartes, matrix.transporte, matrix.alimentosBalanceados, matrix.alimentosCongelados].filter((status) => status === 'COMPRA').length > 1; }).length;
    return res.json({ success: true, data: { metrics: { clientes: clients.length, clientesActivos: activeClients, crossSelling }, clients: clients.map((client) => ({ id: client.id, razonSocial: client.clienteCorporativo.razonSocial, rif: client.clienteCorporativo.rif, estado: client.estado ?? 'SIN ESTADO', vendedor: client.vendedor ?? 'Sin asignar', visitas: client.visitas.map((visit) => ({ semana: visit.semana, dia: visit.dia, fecha: visit.fecha, estado: visit.estado, latitud: visit.latitud, longitud: visit.longitud, comentario: visit.comentario })), ventas: client.ventas.map((sale) => ({ mes: sale.mes, semana: sale.semana, fecha: sale.fecha, documento: sale.documento, unidades: sale.unidades, monto: sale.monto })) })) }, error: '' });
  } catch { return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar el dashboard' }); }
}
