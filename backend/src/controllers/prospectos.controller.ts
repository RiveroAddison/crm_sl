import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getRequestContext } from '../middleware/auth.js';
import { resolveCuentaComercial } from '../services/cuentasComerciales.service.js';

const optionalUuid = z.preprocess((value) => value === '' || value === '00000000-0000-0000-0000-000000000000' ? undefined : value, z.string().uuid().optional());
const prospectSchema = z.object({ razonSocial: z.string().min(2), rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/), titulo: z.string().min(3), rubro: z.string().optional(), direccion: z.string().optional(), telefono: z.string().optional(), etapa: z.enum(['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO']).default('NUEVO'), valorEstimado: z.number().min(0), fechaContacto: z.string().min(1), vendedorNombre: z.string().min(1), cuentaComercialId: optionalUuid, empresaClienteId: optionalUuid });
const stageSchema = z.object({ etapa: z.enum(['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO']) });

function response(prospect: any) { return { ...prospect, fechaContacto: prospect.fechaContacto.toISOString().slice(0, 10) }; }

export async function list(req: Request, res: Response) {
  try { const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); const items = await prisma.oportunidad.findMany({ where: { empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) }, orderBy: { createdAt: 'desc' } }); return res.json({ success: true, data: items.map(response), error: '' }); }
  catch { return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los prospectos' }); }
}

export async function create(req: Request, res: Response) {
  const parsed = prospectSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Prospecto inválido' });
  try { const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); const cuenta = await resolveCuentaComercial(context, { id: parsed.data.cuentaComercialId || parsed.data.empresaClienteId, nombre: parsed.data.razonSocial, rif: parsed.data.rif, direccion: parsed.data.direccion, telefono: parsed.data.telefono }); const item = await prisma.oportunidad.create({ data: { empresaId: context.tenantId, cuentaComercialId: cuenta.id, vendedorId: context.userId, vendedorNombre: context.rol === 'VENDEDOR' ? context.user.nombre : parsed.data.vendedorNombre, titulo: parsed.data.titulo, rubro: parsed.data.rubro || null, direccion: parsed.data.direccion || null, telefono: parsed.data.telefono || null, razonSocial: parsed.data.razonSocial, rif: parsed.data.rif, etapa: parsed.data.etapa, valorEstimado: parsed.data.valorEstimado, fechaContacto: new Date(`${parsed.data.fechaContacto}T00:00:00.000Z`) } }); return res.status(201).json({ success: true, data: response(item), error: '' }); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'No fue posible crear el prospecto'; return res.status(message.includes('Cuenta comercial') ? 409 : 500).json({ success: false, data: null, error: message }); }
}

export async function updateStage(req: Request, res: Response) {
  const parsed = stageSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ success: false, data: null, error: 'Etapa inválida' });
  try {
    const prospectId = String(req.params.id);
    const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const existing = await prisma.oportunidad.findFirst({ where: { id: prospectId, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } });
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Prospecto no encontrado' });
    const account = existing.cuentaComercialId ? null : await resolveCuentaComercial(context, { nombre: existing.razonSocial, rif: existing.rif, direccion: existing.direccion, telefono: existing.telefono });
    const item = await prisma.$transaction(async (transaction) => {
      if (parsed.data.etapa !== 'CONVERTIDO') return transaction.oportunidad.update({ where: { id: existing.id }, data: { etapa: parsed.data.etapa } });
      const corporate = await transaction.clienteCorporativo.upsert({ where: { rif: existing.rif }, update: { razonSocial: existing.razonSocial, direccion: existing.direccion || undefined, telefono: existing.telefono || undefined }, create: { rif: existing.rif, razonSocial: existing.razonSocial, direccion: existing.direccion || null, telefono: existing.telefono || null } });
      const profitCodCli = `PROS-${existing.rif.replace(/[^0-9]/g, '')}`;
      await transaction.clienteEmpresa.upsert({ where: { empresaId_profitCodCli: { empresaId: existing.empresaId, profitCodCli } }, update: { clienteCorporativoId: corporate.id, vendedor: existing.vendedorNombre, vendedorId: existing.vendedorId, estado: 'ACTIVO' }, create: { clienteCorporativoId: corporate.id, empresaId: existing.empresaId, profitCodCli, vendedor: existing.vendedorNombre, vendedorId: existing.vendedorId, estado: 'ACTIVO' } });
      return transaction.oportunidad.update({ where: { id: existing.id }, data: { etapa: parsed.data.etapa, clienteCorporativoId: corporate.id, cuentaComercialId: account?.id || undefined } });
    });
    return res.json({ success: true, data: response(item), error: '' });
  } catch (cause) { console.error('Error al cambiar etapa del prospecto:', cause); const message = cause instanceof Error ? cause.message : 'No fue posible actualizar el prospecto'; return res.status(message.includes('Cuenta comercial') ? 409 : 500).json({ success: false, data: null, error: message }); }
}

export async function remove(req: Request, res: Response) {
  try { const prospectId = String(req.params.id); const context = await getRequestContext(req); if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' }); const item = await prisma.oportunidad.findFirst({ where: { id: prospectId, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } }); if (!item) return res.status(404).json({ success: false, data: null, error: 'Prospecto no encontrado' }); await prisma.oportunidad.delete({ where: { id: item.id } }); return res.json({ success: true, data: { id: item.id }, error: '' }); }
  catch { return res.status(500).json({ success: false, data: null, error: 'No fue posible eliminar el prospecto' }); }
}
