import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type LeadInput = {
  nombreContacto: string;
  empresaNombre: string;
  rif?: string;
  email?: string;
  telefono?: string;
  fuente: 'REDES' | 'WEB' | 'LLAMADA' | 'REFERIDO';
  estadoCalificacion?: 'NUEVO' | 'CALIFICADO' | 'DESCARTADO';
  presupuesto?: number;
  necesidad?: string;
  autoridad?: string;
  tiempo?: string;
  vendedorId?: string;
};

const include = { vendedor: { select: { id: true, nombre: true, email: true } } } as const;

export async function listLeads(context: RequestContext) {
  return prisma.lead.findMany({ where: { empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) }, include, orderBy: { createdAt: 'desc' } });
}

export async function createLead(context: RequestContext, input: LeadInput) {
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : input.vendedorId || context.userId;
  return prisma.lead.create({ data: { ...input, vendedorId, empresaId: context.tenantId }, include });
}

export async function updateLead(context: RequestContext, id: string, input: Partial<LeadInput>) {
  const existing = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } });
  if (!existing) throw new Error('Lead no encontrado');
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : input.vendedorId;
  return prisma.lead.update({ where: { id }, data: { ...input, ...(vendedorId ? { vendedorId } : {}) }, include });
}

export async function deleteLead(context: RequestContext, id: string) {
  const existing = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } });
  if (!existing) throw new Error('Lead no encontrado');
  await prisma.lead.delete({ where: { id } });
  return { id };
}

export async function convertLead(context: RequestContext, id: string) {
  const lead = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) }, include });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estadoCalificacion !== 'CALIFICADO') throw new Error('El lead debe estar CALIFICADO antes de convertirlo');
  return prisma.$transaction(async (transaction) => {
    const opportunity = await transaction.oportunidad.create({ data: { empresaId: lead.empresaId, leadId: lead.id, vendedorId: lead.vendedorId, vendedorNombre: lead.vendedor.nombre, titulo: lead.necesidad || `Oportunidad para ${lead.empresaNombre}`, razonSocial: lead.empresaNombre, rif: lead.rif || 'J-00000000-0', etapa: 'NUEVO', valorEstimado: lead.presupuesto || 0, fechaContacto: new Date() } });
    await transaction.lead.update({ where: { id: lead.id }, data: { estadoCalificacion: 'CALIFICADO' } });
    return opportunity;
  });
}
