import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';
import { resolveCuentaComercial } from './cuentasComerciales.service.js';

export type LeadInput = {
  // Datos empresa
  empresaNombre: string;
  tipoRif?: string;
  numeroRif?: string;
  digitoVerificador?: string;
  rif?: string;
  direccion?: string;
  telefonoEmpresa?: string;
  tipoIndustria?: string;
  
  // Datos contacto
  cedulaContacto?: string;
  nombreContacto: string;
  cargoContacto?: string;
  telefonoContacto?: string;
  emailContacto?: string;
  
  // Captación
  fuente: 'WEB' | 'MENSAJE' | 'CORREO' | 'REUNION' | 'LLAMADA' | 'REFERIDO' | 'REDES';
  fechaCaptacion?: string;
  descripcionCaptacion?: string;
  
  // Otros
  vendedorId?: string;
  cuentaComercialId?: string;
  empresaClienteId?: string;
};

export type AprobarLeadInput = {
  rubro: string;
  estimadoCompra: number;
  necesidadUnidades: number;
  fechaEstimadaCierre: string;
  tipoClienteId: string;
  vendedorAsignadoId: string;
};

export type RechazarLeadInput = {
  rubro: string;
  motivo: string;
};

function buildRif(input: LeadInput): string | null {
  if (input.rif) return input.rif;
  if (input.tipoRif && input.numeroRif && input.digitoVerificador) {
    return `${input.tipoRif}-${input.numeroRif}-${input.digitoVerificador}`;
  }
  return null;
}

const include = {
  vendedor: { select: { id: true, nombre: true, email: true } },
  cuentaComercial: { select: { id: true, nombre: true, rif: true } },
  actividades: {
    include: { autor: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' as const }
  },
  rechazos: true
} as const;

export async function listLeads(context: RequestContext) {
  const leads = await prisma.lead.findMany({
    where: {
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    },
    include,
    orderBy: { createdAt: 'desc' }
  });

  return Promise.all(leads.map(enrichLeadWithCrossSelling));
}

async function enrichLeadWithCrossSelling(lead: any) {
  if (!lead.rif) return { ...lead, crossSelling: null };
  
  const clienteCorporativo = await prisma.clienteCorporativo.findUnique({
    where: { rif: lead.rif },
    include: { crossSellingMatriz: true }
  });
  
  return {
    ...lead,
    crossSelling: clienteCorporativo?.crossSellingMatriz || null
  };
}

export async function createLead(context: RequestContext, input: LeadInput) {
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : (input.vendedorId || context.userId);
  const rif = buildRif(input);

  const cuentaComercial = await resolveCuentaComercial(context, {
    id: input.cuentaComercialId || input.empresaClienteId,
    nombre: input.empresaNombre,
    rif: rif || undefined,
    email: input.emailContacto,
    telefono: input.telefonoEmpresa,
  });

  return prisma.lead.create({
    data: {
      empresaNombre: input.empresaNombre,
      rif: rif || null,
      direccion: input.direccion || null,
      telefonoEmpresa: input.telefonoEmpresa || null,
      tipoIndustria: input.tipoIndustria || null,
      cedulaContacto: input.cedulaContacto || null,
      nombreContacto: input.nombreContacto,
      cargoContacto: input.cargoContacto || null,
      telefonoContacto: input.telefonoContacto || null,
      emailContacto: input.emailContacto || null,
      fuente: input.fuente,
      fechaCaptacion: input.fechaCaptacion ? new Date(input.fechaCaptacion) : new Date(),
      descripcionCaptacion: input.descripcionCaptacion || null,
      estado: 'ACTIVO',
      estadoCalificacion: 'NUEVO',
      vendedorId,
      empresaId: context.tenantId,
      cuentaComercialId: cuentaComercial?.id || null,
    },
    include,
  });
}

export async function updateLead(context: RequestContext, id: string, input: Partial<LeadInput>) {
  const existing = await prisma.lead.findFirst({
    where: {
      id,
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    }
  });
  if (!existing) throw new Error('Lead no encontrado');

  const rif = buildRif(input as LeadInput);

  return prisma.lead.update({
    where: { id },
    data: {
      empresaNombre: input.empresaNombre ?? undefined,
      rif: rif ?? undefined,
      direccion: input.direccion ?? undefined,
      telefonoEmpresa: input.telefonoEmpresa ?? undefined,
      tipoIndustria: input.tipoIndustria ?? undefined,
      cedulaContacto: input.cedulaContacto ?? undefined,
      nombreContacto: input.nombreContacto ?? undefined,
      cargoContacto: input.cargoContacto ?? undefined,
      telefonoContacto: input.telefonoContacto ?? undefined,
      emailContacto: input.emailContacto ?? undefined,
      fuente: input.fuente ?? undefined,
      fechaCaptacion: input.fechaCaptacion ? new Date(input.fechaCaptacion) : undefined,
      descripcionCaptacion: input.descripcionCaptacion ?? undefined,
    },
    include,
  });
}

export async function deleteLead(context: RequestContext, id: string) {
  const existing = await prisma.lead.findFirst({
    where: {
      id,
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    }
  });
  if (!existing) throw new Error('Lead no encontrado');
  await prisma.lead.delete({ where: { id } });
  return { id };
}

export async function aprobarLead(context: RequestContext, id: string, input: AprobarLeadInput) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso para aprobar leads');

  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: context.tenantId },
    include: { vendedor: true, cuentaComercial: true }
  });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estado === 'APROBADO') throw new Error('El lead ya fue aprobado');

  const rechazoExistente = await prisma.leadRechazo.findUnique({
    where: { leadId_rubro: { leadId: id, rubro: input.rubro } }
  });
  if (rechazoExistente) throw new Error(`El lead fue rechazado para el rubro ${input.rubro}`);

  let crossSellingInfo: { clienteCorporativoId: string; [key: string]: any } | null = null;
  if (lead.rif) {
    const clienteCorporativo = await prisma.clienteCorporativo.findUnique({
      where: { rif: lead.rif },
      include: { crossSellingMatriz: true }
    });
    if (clienteCorporativo?.crossSellingMatriz) {
      const matriz = clienteCorporativo.crossSellingMatriz;
      crossSellingInfo = {
        clienteCorporativoId: clienteCorporativo.id,
        combustible: matriz.combustible,
        lubricantes: matriz.lubricantes,
        autopartes: matriz.autopartes,
        transporte: matriz.transporte,
        alimentosBalanceados: matriz.alimentosBalanceados,
        alimentosCongelados: matriz.alimentosCongelados
      };
    }
  }

  const vendedorAsignado = await prisma.usuario.findUnique({
    where: { id: input.vendedorAsignadoId }
  });

  return prisma.$transaction(async (tx) => {
    const oportunidad = await tx.oportunidad.create({
      data: {
        empresaId: lead.empresaId,
        cuentaComercialId: lead.cuentaComercialId,
        leadId: lead.id,
        vendedorId: input.vendedorAsignadoId,
        vendedorNombre: vendedorAsignado?.nombre || '',
        titulo: `${input.rubro} - ${lead.empresaNombre}`,
        rubro: input.rubro,
        razonSocial: lead.empresaNombre,
        rif: lead.rif || 'J-00000000-0',
        etapa: 'NUEVO',
        valorEstimado: input.estimadoCompra,
        fechaContacto: new Date(),
      }
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: { estado: 'APROBADO' }
    });

    if (crossSellingInfo) {
      const updateData: Record<string, string> = {};
      const rubroToField: Record<string, string> = {
        'COMBUSTIBLE': 'combustible',
        'LUBRICANTES': 'lubricantes',
        'AUTOPARTES': 'autopartes',
        'TRANSPORTE': 'transporte',
        'ALIMENTOS_BALANCEADOS': 'alimentosBalanceados',
        'ALIMENTOS_CONGELADOS': 'alimentosCongelados',
      };
      const field = rubroToField[input.rubro.toUpperCase()];
      if (field) {
        updateData[field] = 'COMPRA';
        await tx.crossSellingMatriz.update({
          where: { clienteCorporativoId: crossSellingInfo.clienteCorporativoId },
          data: updateData
        });
      }
    }

    return oportunidad;
  });
}

export async function rechazarLead(context: RequestContext, id: string, input: RechazarLeadInput) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso para rechazar leads');

  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: context.tenantId }
  });
  if (!lead) throw new Error('Lead no encontrado');

  return prisma.$transaction(async (tx) => {
    await tx.leadRechazo.create({
      data: {
        leadId: id,
        empresaId: context.tenantId,
        rubro: input.rubro,
        motivo: input.motivo,
        rechazadoBy: context.userId
      }
    });

    const rechazos = await tx.leadRechazo.findMany({
      where: { leadId: id }
    });

    if (rechazos.length >= 3) {
      await tx.lead.update({
        where: { id },
        data: { estado: 'RECHAZADO' }
      });
    }

    return { success: true, leadId: id, rubro: input.rubro };
  });
}

export async function getRechazosLead(context: RequestContext, leadId: string) {
  return prisma.leadRechazo.findMany({
    where: { leadId, empresaId: context.tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function convertLead(context: RequestContext, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: context.tenantId, ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {}) },
    include: { vendedor: true, cuentaComercial: true }
  });
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
