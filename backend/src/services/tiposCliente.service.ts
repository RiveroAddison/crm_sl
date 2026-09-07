import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CreateTipoClienteInput = { nombre: string };
export type UpdateTipoClienteInput = { nombre?: string; activo?: boolean };

export async function listTiposCliente(context: RequestContext) {
  return prisma.tipoCliente.findMany({
    where: { empresaId: context.tenantId, activo: true },
    orderBy: { nombre: 'asc' }
  });
}

export async function createTipoCliente(context: RequestContext, input: CreateTipoClienteInput) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso');

  return prisma.tipoCliente.create({
    data: { empresaId: context.tenantId, nombre: input.nombre }
  });
}

export async function updateTipoCliente(context: RequestContext, id: string, input: UpdateTipoClienteInput) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso');

  const existing = await prisma.tipoCliente.findFirst({
    where: { id, empresaId: context.tenantId }
  });
  if (!existing) throw new Error('Tipo de cliente no encontrado');

  return prisma.tipoCliente.update({ where: { id }, data: input });
}

export async function deleteTipoCliente(context: RequestContext, id: string) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso');

  const existing = await prisma.tipoCliente.findFirst({
    where: { id, empresaId: context.tenantId }
  });
  if (!existing) throw new Error('Tipo de cliente no encontrado');

  return prisma.tipoCliente.update({ where: { id }, data: { activo: false } });
}
