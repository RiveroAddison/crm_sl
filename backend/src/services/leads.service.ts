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

const include = {
  vendedor: { select: { id: true, nombre: true, email: true } },
  empresaCliente: { select: { id: true, nombre: true, rif: true } },
} as const;

async function upsertEmpresaCliente(
  tenantId: string,
  data: { nombre: string; rif?: string | null; email?: string | null; telefono?: string | null }
) {
  const existing = await prisma.empresaCliente.findFirst({
    where: { empresaId: tenantId, nombre: data.nombre }
  });
  if (existing) {
    return prisma.empresaCliente.update({
      where: { id: existing.id },
      data: {
        rif: data.rif ?? existing.rif,
        email: data.email ?? existing.email,
        telefono: data.telefono ?? existing.telefono,
      }
    });
  }
  return prisma.empresaCliente.create({
    data: {
      empresaId: tenantId,
      nombre: data.nombre,
      rif: data.rif || null,
      email: data.email || null,
      telefono: data.telefono || null,
    }
  });
}

export async function listLeads(context: RequestContext) {
  return prisma.lead.findMany({
    where: { empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) },
    include,
    orderBy: { createdAt: 'desc' }
  });
}

export async function createLead(context: RequestContext, input: LeadInput) {
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : input.vendedorId || context.userId;

  const empresaCliente = await upsertEmpresaCliente(context.tenantId, {
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
      empresaClienteId: empresaCliente.id,
    },
    include,
  });
}

export async function updateLead(context: RequestContext, id: string, input: Partial<LeadInput>) {
  const existing = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) } });
  if (!existing) throw new Error('Lead no encontrado');
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : input.vendedorId;

  let empresaClienteId = existing.empresaClienteId;
  if (input.empresaNombre && input.empresaNombre !== existing.empresaNombre) {
    const ec = await upsertEmpresaCliente(context.tenantId, {
      nombre: input.empresaNombre,
      rif: input.rif,
      email: input.email,
      telefono: input.telefono,
    });
    empresaClienteId = ec.id;
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
      empresaClienteId: empresaClienteId ?? undefined,
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
  const lead = await prisma.lead.findFirst({ where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) }, include: { vendedor: true, empresaCliente: true } });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estadoCalificacion !== 'CALIFICADO') throw new Error('El lead debe estar CALIFICADO antes de convertirlo');
  return prisma.$transaction(async (transaction) => {
    const opportunity = await transaction.oportunidad.create({
      data: {
        empresaId: lead.empresaId,
        empresaClienteId: lead.empresaClienteId,
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
