import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CuentaComercialInput = {
  id?: string | null;
  rif?: string | null;
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
};

export function normalizeRif(value?: string | null) {
  return value?.trim().toUpperCase() || null;
}

export function normalizeNombre(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE') || null;
}

export async function resolveCuentaComercial(
  context: RequestContext,
  input: CuentaComercialInput,
  options: { createIfMissing?: boolean } = {}
) {
  const createIfMissing = options.createIfMissing ?? true;
  const rif = normalizeRif(input.rif);
  const nombre = input.nombre?.trim() || null;

  if (input.id) {
    const byId = await prisma.cuentaComercial.findFirst({
      where: { id: input.id, empresaId: context.tenantId, activo: true }
    });
    if (!byId) throw new Error('Cuenta comercial no encontrada en la empresa activa');
    if (rif && normalizeRif(byId.rif) !== rif) {
      throw new Error('El RIF no coincide con la cuenta comercial seleccionada');
    }
    return byId;
  }

  if (rif) {
    const candidates = await prisma.cuentaComercial.findMany({
      where: { empresaId: context.tenantId, activo: true }
    });
    const rifMatches = candidates.filter((item) => normalizeRif(item.rif) === rif);
    if (rifMatches.length > 1) throw new Error('Existen cuentas comerciales duplicadas para el RIF');
    const byRif = rifMatches[0];
    if (byRif) return updateCuentaComercial(byRif.id, input);
  }

  if (nombre) {
    const candidates = await prisma.cuentaComercial.findMany({
      where: { empresaId: context.tenantId, activo: true },
      orderBy: { createdAt: 'asc' }
    });
    const nameMatches = candidates.filter((item) => normalizeNombre(item.nombre) === normalizeNombre(nombre));
    if (nameMatches.length > 1) throw new Error('Existen cuentas comerciales duplicadas para el nombre');
    const byNombre = nameMatches[0];
    if (byNombre) return updateCuentaComercial(byNombre.id, input);
  }

  if (!createIfMissing) throw new Error('Cuenta comercial no encontrada');
  if (!nombre) throw new Error('El nombre de la cuenta comercial es requerido');

  return prisma.cuentaComercial.create({
    data: {
      empresaId: context.tenantId,
      nombre,
      rif,
      email: input.email?.trim() || null,
      telefono: input.telefono?.trim() || null,
      direccion: input.direccion?.trim() || null
    }
  });
}

async function updateCuentaComercial(id: string, input: CuentaComercialInput) {
  return prisma.cuentaComercial.update({
    where: { id },
    data: {
      rif: normalizeRif(input.rif) ?? undefined,
      email: input.email?.trim() || undefined,
      telefono: input.telefono?.trim() || undefined,
      direccion: input.direccion?.trim() || undefined
    }
  });
}
