import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import { convertLead, createLead, deleteLead, listLeads, updateLead } from '../services/leads.service.js';

const optionalUuid = z.preprocess((value) => value === '' || value === '00000000-0000-0000-0000-000000000000' ? undefined : value, z.string().uuid().optional());
const leadSchema = z.object({
  nombreContacto: z.string().min(2), empresaNombre: z.string().min(2), rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')), telefono: z.string().optional(), fuente: z.enum(['REDES', 'WEB', 'LLAMADA', 'REFERIDO']),
  estadoCalificacion: z.enum(['NUEVO', 'CALIFICADO', 'DESCARTADO']).optional(), presupuesto: z.number().min(0).optional(), necesidad: z.string().optional(), autoridad: z.string().optional(), tiempo: z.string().optional(), vendedorId: optionalUuid, cuentaComercialId: optionalUuid, empresaClienteId: optionalUuid
});
const patchSchema = leadSchema.partial();

function errorStatus(message: string) { return message === 'Lead no encontrado' || message.includes('Cuenta comercial no encontrada') ? 404 : message.includes('Cuenta comercial') || message.includes('coincide') || message.includes('empresa activa') ? 409 : message.includes('CALIFICADO') ? 409 : 500; }

export async function list(req: Request, res: Response) {
  try { const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); return res.json({ success: true, data: await listLeads(context), error: '' }); }
  catch { return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los leads' }); }
}

export async function create(req: Request, res: Response) {
  const parsed = leadSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Lead inválido' });
  try { 
    const context = await getRequestContext(req); 
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); 
    const newleads = await createLead(context, parsed.data);
    return res.status(201).json({ success: true, data: newleads, error: '' }); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'No fue posible crear el lead'; return res.status(errorStatus(message)).json({ success: false, data: null, error: message }); }
}

export async function update(req: Request, res: Response) {
  const parsed = patchSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ success: false, data: null, error: 'Lead inválido' });
  try { const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); return res.json({ success: true, data: await updateLead(context, String(req.params.id), parsed.data), error: '' }); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'No fue posible actualizar el lead'; return res.status(errorStatus(message)).json({ success: false, data: null, error: message }); }
}

export async function remove(req: Request, res: Response) {
  try { const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); return res.json({ success: true, data: await deleteLead(context, String(req.params.id)), error: '' }); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'No fue posible eliminar el lead'; return res.status(errorStatus(message)).json({ success: false, data: null, error: message }); }
}

export async function promote(req: Request, res: Response) {
  try { const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); return res.status(201).json({ success: true, data: await convertLead(context, String(req.params.id)), error: '' }); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'No fue posible convertir el lead'; return res.status(errorStatus(message)).json({ success: false, data: null, error: message }); }
}
