import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CreateOrderItemInput = {
  producto: string;
  cantidad: number;
  precioUnitario: number;
};

export type CreateOrderInput = {
  clienteEmpresaId?: string;
  oportunidadId?: string;
  empresaClienteId?: string;
  detalles: CreateOrderItemInput[];
};

const include = {
  detalles: true,
  clienteEmpresa: {
    include: {
      clienteCorporativo: true
    }
  },
  empresaCliente: {
    select: { id: true, nombre: true, rif: true }
  },
  vendedor: {
    select: {
      id: true,
      nombre: true
    }
  }
} as const;

export async function listOrders(context: RequestContext) {
  return prisma.pedido.findMany({
    where: {
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    },
    include,
    orderBy: { createdAt: 'desc' }
  });
}

export async function createOrder(context: RequestContext, input: CreateOrderInput) {
  let clienteEmpresaId = input.clienteEmpresaId;
  let empresaClienteId = input.empresaClienteId || null;

  if (!clienteEmpresaId && input.oportunidadId) {
    const opportunity = await prisma.oportunidad.findFirst({
      where: {
        id: input.oportunidadId,
        empresaId: context.tenantId,
        etapa: 'CONVERTIDO',
        ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
      }
    });

    if (opportunity?.clienteCorporativoId) {
      const clientEmpresa = await prisma.clienteEmpresa.findFirst({
        where: {
          empresaId: context.tenantId,
          clienteCorporativoId: opportunity.clienteCorporativoId
        }
      });
      clienteEmpresaId = clientEmpresa?.id;
      empresaClienteId = empresaClienteId || opportunity.empresaClienteId;
    }
  }

  const client = clienteEmpresaId
    ? await prisma.clienteEmpresa.findFirst({
        where: {
          id: clienteEmpresaId,
          empresaId: context.tenantId,
          ...(context.rol === 'VENDEDOR' ? { vendedor: context.user.nombre } : {})
        }
      })
    : null;

  if (!client) {
    throw new Error('Cliente no encontrado o fuera de la cartera');
  }

  const total = input.detalles.reduce((sum, detail) => sum + detail.cantidad * detail.precioUnitario, 0);

  return prisma.pedido.create({
    data: {
      empresaId: context.tenantId,
      empresaClienteId: empresaClienteId,
      clienteEmpresaId: client.id,
      vendedorId: context.userId,
      montoTotal: total,
      detalles: {
        create: input.detalles
      }
    },
    include
  });
}

export async function updateOrderStatus(context: RequestContext, id: string, estado: string) {
  const existing = await prisma.pedido.findFirst({
    where: {
      id,
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    }
  });

  if (!existing) {
    throw new Error('Pedido no encontrado');
  }

  return prisma.pedido.update({
    where: { id },
    data: { estado },
    include
  });
}
