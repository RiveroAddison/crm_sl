import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  listTiposCliente,
  createTipoCliente,
  updateTipoCliente,
  deleteTipoCliente
} from '../services/tiposCliente.service.js';
import { sanitizeError, errorStatus } from '../utils/index.js';
import type { RequestContext } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const createSchema = z.object({ nombre: z.string().min(2) });
const updateSchema = z.object({ nombre: z.string().min(2).optional(), activo: z.boolean().optional() });

export async function list(req: Request, res: Response) {
  try {
    const context = req.context as RequestContext;
    const empresaIdOverride = typeof req.query.empresaId === 'string' ? req.query.empresaId : undefined;
    return res.json({ success: true, data: await listTiposCliente(context, empresaIdOverride), error: '' });
  } catch (err) {
    logger.error({ err }, '[tiposCliente] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los tipos de cliente' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = req.context as RequestContext;
    return res.status(201).json({ success: true, data: await createTipoCliente(context, parsed.data), error: '' });
  } catch (cause) {
    const message = sanitizeError(cause, 'No fue posible crear el tipo de cliente');
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = req.context as RequestContext;
    return res.json({ success: true, data: await updateTipoCliente(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = sanitizeError(cause, 'No fue posible actualizar el tipo de cliente');
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const context = req.context as RequestContext;
    return res.json({ success: true, data: await deleteTipoCliente(context, String(req.params.id)), error: '' });
  } catch (cause) {
    const message = sanitizeError(cause, 'No fue posible eliminar el tipo de cliente');
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}
