import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import { listActividades, createActividad } from '../services/actividades.service.js';

const actividadSchema = z.object({
  tipo: z.enum(['CAPTACION', 'SEGUIMIENTO', 'LLAMADA', 'EMAIL', 'VISITA', 'REUNION', 'NOTA', 'WHATSAPP']),
  descripcion: z.string().min(5),
  fecha: z.string().optional(),
});

function errorStatus(message: string) {
  if (message.includes('no encontrado')) return 404;
  if (message.includes('permiso')) return 403;
  return 500;
}

export async function list(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listActividades(context, String(req.params.id)), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar las actividades' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = actividadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Actividad inválida' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await createActividad(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible crear la actividad';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}
