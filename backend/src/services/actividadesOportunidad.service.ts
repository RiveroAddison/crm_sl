import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CreateActividadOportunidadInput = {
  tipo: 'CAPTACION' | 'SEGUIMIENTO' | 'LLAMADA' | 'EMAIL' | 'VISITA' | 'REUNION' | 'NOTA' | 'WHATSAPP';
  descripcion: string;
  fecha?: string;
};

export async function listActividades(context: RequestContext, oportunidadId: string) {
  const oportunidad = await prisma.oportunidad.findFirst({
    where: { id: oportunidadId, empresaId: context.tenantId }
  });
  if (!oportunidad) throw new Error('Oportunidad no encontrada');

  return prisma.actividadOportunidad.findMany({
    where: { oportunidadId },
    include: { autor: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' }
  });
}

export async function createActividad(context: RequestContext, oportunidadId: string, input: CreateActividadOportunidadInput) {
  const oportunidad = await prisma.oportunidad.findFirst({
    where: { id: oportunidadId, empresaId: context.tenantId }
  });
  if (!oportunidad) throw new Error('Oportunidad no encontrada');

  if (context.rol === 'VENDEDOR' && oportunidad.vendedorId !== context.userId) {
    throw new Error('No tienes permiso para crear actividades en esta oportunidad');
  }

  return prisma.actividadOportunidad.create({
    data: {
      oportunidadId,
      empresaId: context.tenantId,
      autorId: context.userId,
      tipo: input.tipo,
      descripcion: input.descripcion,
      fecha: input.fecha ? new Date(input.fecha) : new Date()
    },
    include: { autor: { select: { id: true, nombre: true } } }
  });
}
