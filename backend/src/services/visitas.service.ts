import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CheckInInput = {
  clienteRazonSocial: string;
  rif: string;
  semana: number;
  dia: string;
  latitud: number;
  longitud: number;
  comentario?: string;
};

function toResponse(visit: {
  id: string;
  clienteEmpresa: { empresaId: string; vendedor: string | null; clienteCorporativo: { razonSocial: string; rif: string } };
  semana: number;
  dia: string;
  estado: string;
  latitud: number | null;
  longitud: number | null;
  comentario: string | null;
  visitadoAt: Date | null;
  fecha: Date | null;
}) {
  return {
    id: visit.id,
    empresaId: visit.clienteEmpresa.empresaId,
    vendedorNombre: visit.clienteEmpresa.vendedor || 'Sin asignar',
    clienteRazonSocial: visit.clienteEmpresa.clienteCorporativo.razonSocial,
    rif: visit.clienteEmpresa.clienteCorporativo.rif,
    semana: visit.semana,
    dia: visit.dia,
    estado: visit.estado,
    latitud: visit.latitud,
    longitud: visit.longitud,
    comentario: visit.comentario,
    fechaHora: (visit.visitadoAt || visit.fecha)?.toISOString() || ''
  };
}

export async function listVisits(context: RequestContext) {
  const visits = await prisma.visitaCliente.findMany({
    where: {
      clienteEmpresa: {
        empresaId: context.tenantId,
        ...(context.rol === 'VENDEDOR' ? { vendedor: context.user.nombre } : {})
      }
    },
    include: { clienteEmpresa: { include: { clienteCorporativo: true } } },
    orderBy: { visitadoAt: 'desc' }
  });
  return visits.map(toResponse);
}

export async function registerCheckIn(context: RequestContext, input: CheckInInput) {
  const client = await prisma.clienteEmpresa.findFirst({
    where: {
      empresaId: context.tenantId,
      vendedor: context.rol === 'VENDEDOR' ? context.user.nombre : undefined,
      clienteCorporativo: { rif: input.rif }
    },
    include: { clienteCorporativo: true }
  });
  if (!client) throw new Error('Cliente no encontrado o no pertenece a tu cartera');
  const visit = await prisma.visitaCliente.upsert({
    where: { clienteEmpresaId_semana_dia: { clienteEmpresaId: client.id, semana: input.semana, dia: input.dia } },
    update: { estado: 'VISITADO', visitadoAt: new Date(), latitud: input.latitud, longitud: input.longitud, comentario: input.comentario || null },
    create: { clienteEmpresaId: client.id, semana: input.semana, dia: input.dia, estado: 'VISITADO', visitadoAt: new Date(), latitud: input.latitud, longitud: input.longitud, comentario: input.comentario || null }
  });
  return toResponse({ ...visit, clienteEmpresa: client });
}
