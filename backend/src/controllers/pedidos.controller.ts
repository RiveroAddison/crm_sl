import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import { createOrder, listOrders, updateOrderStatus } from '../services/pedidos.service.js';

const orderSchema = z
  .object({
    clienteEmpresaId: z.string().uuid().optional(),
    oportunidadId: z.string().uuid().optional(),
    detalles: z
      .array(
        z.object({
          producto: z.string().min(1),
          cantidad: z.number().int().positive(),
          precioUnitario: z.number().nonnegative()
        })
      )
      .min(1)
  })
  .refine((value) => value.clienteEmpresaId || value.oportunidadId, {
    message: 'Debe indicar cliente u oportunidad convertida'
  });

const statusSchema = z.object({
  estado: z.enum(['PENDIENTE', 'APROBADO', 'FACTURADO', 'ANULADO'])
});

export async function list(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const orders = await listOrders(context);
    return res.json({ success: true, data: orders, error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los pedidos' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: parsed.error.issues[0]?.message || 'Pedido inválido'
    });
  }

  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const order = await createOrder(context, parsed.data);
    return res.status(201).json({ success: true, data: order, error: '' });
  } catch (cause) {
    return res.status(400).json({
      success: false,
      data: null,
      error: cause instanceof Error ? cause.message : 'No fue posible crear el pedido'
    });
  }
}

export async function updateStatus(req: Request, res: Response) {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Estado inválido'
    });
  }

  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const order = await updateOrderStatus(context, String(req.params.id), parsed.data.estado);
    return res.json({ success: true, data: order, error: '' });
  } catch (cause) {
    return res.status(404).json({
      success: false,
      data: null,
      error: cause instanceof Error ? cause.message : 'No fue posible actualizar el pedido'
    });
  }
}

