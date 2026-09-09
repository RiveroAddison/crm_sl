import type { Request, Response } from 'express';
import { z } from 'zod';
import { listActividades, createActividad } from '../services/actividadesOportunidad.service.js';
import { sanitizeError, errorStatus } from '../utils/index.js';
import type { RequestContext } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const actividadSchema = z.object({
  tipo: z.enum(['CAPTACION', 'SEGUIMIENTO', 'LLAMADA', 'EMAIL', 'VISITA', 'REUNION', 'NOTA', 'WHATSAPP']),
  descripcion: z.string().min(5),
  fecha: z.string().optional(),
});

export async function list(req: Request, res: Response) {
  try {
    const context = req.context as RequestContext;
    return res.json({ success: true, data: await listActividades(context, String(req.params.id)), error: '' });
  } catch (err) {
    logger.error({ err }, '[actividadesOportunidad] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar las actividades' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = actividadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Actividad inválida' });
  try {
    const context = req.context as RequestContext;
    return res.status(201).json({ success: true, data: await createActividad(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = sanitizeError(cause, 'No fue posible crear la actividad');
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}
