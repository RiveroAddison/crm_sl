import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CreateActividadInput = {
  tipo: 'CAPTACION' | 'SEGUIMIENTO' | 'LLAMADA' | 'EMAIL' | 'VISITA' | 'REUNION' | 'NOTA' | 'WHATSAPP';
  descripcion: string;
  fecha?: string;
};

export async function listActividades(context: RequestContext, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, empresaId: context.tenantId }
  });
  if (!lead) throw new Error('Lead no encontrado');

  return prisma.actividadLead.findMany({
    where: { leadId },
    include: { autor: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' }
  });
}

export async function createActividad(context: RequestContext, leadId: string, input: CreateActividadInput) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, empresaId: context.tenantId }
  });
  if (!lead) throw new Error('Lead no encontrado');

  if (context.rol === 'VENDEDOR' && lead.vendedorId !== context.userId) {
    throw new Error('No tienes permiso para crear actividades en este lead');
  }

  return prisma.actividadLead.create({
    data: {
      leadId,
      empresaId: context.tenantId,
      autorId: context.userId,
      tipo: input.tipo,
      descripcion: input.descripcion,
      fecha: input.fecha ? new Date(input.fecha) : new Date()
    },
    include: { autor: { select: { id: true, nombre: true } } }
  });
}
