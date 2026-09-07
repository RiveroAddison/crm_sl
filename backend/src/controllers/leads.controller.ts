import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import {
  convertLead,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
  aprobarLead,
  rechazarLead,
  getRechazosLead
} from '../services/leads.service.js';
import { listActividades, createActividad } from '../services/actividades.service.js';

const optionalUuid = z.preprocess(
  (value) => value === '' || value === '00000000-0000-0000-0000-000000000000' ? undefined : value,
  z.string().uuid().optional()
);

const leadSchema = z.object({
  empresaNombre: z.string().min(2),
  tipoRif: z.enum(['V', 'J', 'E', 'G', 'R', 'P']).optional(),
  numeroRif: z.string().regex(/^\d{8,9}$/).optional(),
  digitoVerificador: z.string().regex(/^\d$/).optional(),
  rif: z.string().optional(),
  direccion: z.string().optional(),
  telefonoEmpresa: z.string().optional(),
  tipoIndustria: z.string().optional(),
  cedulaContacto: z.string().optional(),
  nombreContacto: z.string().min(2),
  cargoContacto: z.string().optional(),
  telefonoContacto: z.string().optional(),
  emailContacto: z.string().email().optional().or(z.literal('')),
  fuente: z.enum(['WEB', 'MENSAJE', 'CORREO', 'REUNION', 'LLAMADA', 'REFERIDO', 'REDES']),
  fechaCaptacion: z.string().optional(),
  descripcionCaptacion: z.string().optional(),
  vendedorId: optionalUuid,
  cuentaComercialId: optionalUuid,
  empresaClienteId: optionalUuid,
});

const aprobarLeadSchema = z.object({
  rubro: z.string().min(1),
  estimadoCompra: z.number().min(0),
  necesidadUnidades: z.number().min(1),
  fechaEstimadaCierre: z.string(),
  tipoClienteId: z.string().uuid(),
  vendedorAsignadoId: z.string().uuid(),
});

const rechazarLeadSchema = z.object({
  rubro: z.string().min(1),
  motivo: z.string().min(10),
});

const actividadSchema = z.object({
  tipo: z.enum(['CAPTACION', 'SEGUIMIENTO', 'LLAMADA', 'EMAIL', 'VISITA', 'REUNION', 'NOTA', 'WHATSAPP']),
  descripcion: z.string().min(5),
  fecha: z.string().optional(),
});

const patchSchema = leadSchema.partial();

function errorStatus(message: string) {
  if (message === 'Lead no encontrado' || message.includes('no encontrado')) return 404;
  if (message.includes('Cuenta comercial') || message.includes('coincide') || message.includes('empresa activa')) return 409;
  if (message.includes('CALIFICADO') || message.includes('APROBADO')) return 409;
  if (message.includes('permiso')) return 403;
  return 500;
}

export async function list(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listLeads(context), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los leads' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Lead inválido' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const newLead = await createLead(context, parsed.data);
    return res.status(201).json({ success: true, data: newLead, error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible crear el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function update(req: Request, res: Response) {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Lead inválido' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await updateLead(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible actualizar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await deleteLead(context, String(req.params.id)), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible eliminar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function promote(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await convertLead(context, String(req.params.id)), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible convertir el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function approve(req: Request, res: Response) {
  const parsed = aprobarLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await aprobarLead(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible aprobar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function reject(req: Request, res: Response) {
  const parsed = rechazarLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await rechazarLead(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible rechazar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function listRechazos(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await getRechazosLead(context, String(req.params.id)), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los rechazos' });
  }
}

export async function listActividadesEndpoint(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listActividades(context, String(req.params.id)), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar las actividades' });
  }
}

export async function createActividadEndpoint(req: Request, res: Response) {
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
