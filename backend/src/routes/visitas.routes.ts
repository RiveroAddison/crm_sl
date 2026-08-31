import { Router } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import { listVisits, registerCheckIn } from '../services/visitas.service.js';

const router = Router();
const checkInSchema = z.object({
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/),
  clienteRazonSocial: z.string().min(1),
  semana: z.number().int().min(1).max(4),
  dia: z.string().min(1),
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  comentario: z.string().max(500).optional()
});

router.get('/', async (req, res) => {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listVisits(context), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar las visitas' });
  }
});

router.post('/checkin', async (req, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Check-in inválido' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const visit = await registerCheckIn(context, parsed.data);
    return res.status(201).json({ success: true, data: visit, error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible registrar el check-in';
    return res.status(message.includes('Cliente no encontrado') ? 404 : 500).json({ success: false, data: null, error: message });
  }
});

export default router;
