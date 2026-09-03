import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';
import { resolveCuentaComercial } from './cuentasComerciales.service.js';

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
  empresaClienteId?: string;
  cuentaComercialId?: string;
};

const include = {
  vendedor: { select: { id: true, nombre: true, email: true } },
  cuentaComercial: { select: { id: true, nombre: true, rif: true } },
} as const;

export async function listLeads(context: RequestContext) {
  return prisma.lead.findMany({
    where: { empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) },
    include,
    orderBy: { createdAt: 'desc' }
  });
}

export async function createLead(context: RequestContext, input: LeadInput) {
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : input.vendedorId || context.userId;

  const cuentaComercial = await resolveCuentaComercial(context, {
    id: input.cuentaComercialId || input.empresaClienteId,
    nombre: input.empresaNombre,
    rif: input.rif,
    email: input.email,
    telefono: input.telefono,
  });

  return prisma.lead.create({
    data: {
      nombreContacto: input.nombreContacto,
      empresaNombre: input.empresaNombre,
      rif: input.rif || null,
      email: input.email || null,
      telefono: input.telefono || null,
      fuente: input.fuente,
      estadoCalificacion: input.estadoCalificacion || 'NUEVO',
      presupuesto: input.presupuesto ?? null,
      necesidad: input.necesidad || null,
      autoridad: input.autoridad || null,
      tiempo: input.tiempo || null,
      vendedorId,
      empresaId: context.tenantId,
      cuentaComercialId: cuentaComercial.id,
    },
    include,
  });
}

export async function updateLead(context: RequestContext, id: string, input: Partial<LeadInput>) {
  const existing = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } });
  if (!existing) throw new Error('Lead no encontrado');
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : input.vendedorId;

  let cuentaComercialId = existing.cuentaComercialId;
  if (input.cuentaComercialId || input.empresaClienteId || input.empresaNombre || input.rif) {
    const cuenta = await resolveCuentaComercial(context, {
      id: input.cuentaComercialId || input.empresaClienteId || undefined,
      nombre: input.empresaNombre,
      rif: input.rif,
      email: input.email,
      telefono: input.telefono,
    });
    cuentaComercialId = cuenta.id;
  }

  return prisma.lead.update({
    where: { id },
    data: {
      nombreContacto: input.nombreContacto ?? undefined,
      empresaNombre: input.empresaNombre ?? undefined,
      rif: input.rif ?? undefined,
      email: input.email ?? undefined,
      telefono: input.telefono ?? undefined,
      fuente: input.fuente ?? undefined,
      estadoCalificacion: input.estadoCalificacion ?? undefined,
      presupuesto: input.presupuesto ?? undefined,
      necesidad: input.necesidad ?? undefined,
      autoridad: input.autoridad ?? undefined,
      tiempo: input.tiempo ?? undefined,
      vendedorId: vendedorId ?? undefined,
      cuentaComercialId: cuentaComercialId ?? undefined,
    },
    include,
  });
}

export async function deleteLead(context: RequestContext, id: string) {
  const existing = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } });
  if (!existing) throw new Error('Lead no encontrado');
  await prisma.lead.delete({ where: { id } });
  return { id };
}

export async function convertLead(context: RequestContext, id: string) {
  const lead = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) }, include: { vendedor: true, cuentaComercial: true } });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estadoCalificacion !== 'CALIFICADO') throw new Error('El lead debe estar CALIFICADO antes de convertirlo');
  return prisma.$transaction(async (transaction) => {
    const opportunity = await transaction.oportunidad.create({
      data: {
        empresaId: lead.empresaId,
        cuentaComercialId: lead.cuentaComercialId,
        leadId: lead.id,
        vendedorId: lead.vendedorId,
        vendedorNombre: lead.vendedor.nombre,
        titulo: lead.necesidad || `Oportunidad para ${lead.empresaNombre}`,
        razonSocial: lead.empresaNombre,
        rif: lead.rif || 'J-00000000-0',
        etapa: 'NUEVO',
        valorEstimado: lead.presupuesto || 0,
        fechaContacto: new Date(),
      }
    });
    await transaction.lead.update({ where: { id: lead.id }, data: { estadoCalificacion: 'CALIFICADO' } });
    return opportunity;
  });
}
