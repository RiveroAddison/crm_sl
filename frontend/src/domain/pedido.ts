// filepath: src/domain/pedido.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, UuidSchema } from './api';

export const PedidoEstadoSchema = z.enum(['PENDIENTE', 'APROBADO', 'FACTURADO', 'ANULADO']);
export type PedidoEstado = z.infer<typeof PedidoEstadoSchema>;

export const DetallePedidoInputSchema = z.object({
  producto: z.string().min(1),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
});
export type DetallePedidoInput = z.infer<typeof DetallePedidoInputSchema>;

export const DetallePedidoSchema = DetallePedidoInputSchema.extend({
  id: z.string(),
  pedidoId: z.string(),
});
export type DetallePedido = z.infer<typeof DetallePedidoSchema>;

export const CreatePedidoInputSchema = z
  .object({
    clienteEmpresaId: UuidSchema.optional(),
    oportunidadId: UuidSchema.optional(),
    detalles: z.array(DetallePedidoInputSchema).min(1),
  })
  .refine((v) => Boolean(v.clienteEmpresaId) || Boolean(v.oportunidadId), {
    message: 'Debe indicar cliente u oportunidad convertida',
  });
export type CreatePedidoInput = z.infer<typeof CreatePedidoInputSchema>;

export const PedidoSchema = z.object({
  id: z.string(),
  empresaId: UuidSchema,
  clienteEmpresaId: z.string(),
  vendedorId: z.string(),
  estado: PedidoEstadoSchema,
  montoTotal: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  detalles: z.array(DetallePedidoSchema),
  clienteEmpresa: z
    .object({
      id: z.string(),
      profitCodCli: z.string(),
      clienteCorporativo: z.object({
        id: z.string(),
        razonSocial: z.string(),
        rif: z.string(),
      }),
    })
    .optional(),
  vendedor: z.object({ id: z.string(), nombre: z.string() }).optional(),
});
export type Pedido = z.infer<typeof PedidoSchema>;

export const UpdatePedidoEstadoInputSchema = z.object({ estado: PedidoEstadoSchema });
export type UpdatePedidoEstadoInput = z.infer<typeof UpdatePedidoEstadoInputSchema>;

export const PedidoListResponseSchema = ApiEnvelopeSchema(z.array(PedidoSchema));
export const PedidoResponseSchema = ApiEnvelopeSchema(PedidoSchema);
