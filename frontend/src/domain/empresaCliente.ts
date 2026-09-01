// filepath: src/domain/empresaCliente.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, UuidSchema } from './api';

export const EmpresaClienteSchema = z.object({
  id: z.string(),
  empresaId: UuidSchema,
  nombre: z.string(),
  rif: z.string().nullable(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  direccion: z.string().nullable(),
  activo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmpresaCliente = z.infer<typeof EmpresaClienteSchema>;

export const EmpresaClienteInputSchema = z.object({
  nombre: z.string().min(1).max(100),
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});
export type EmpresaClienteInput = z.infer<typeof EmpresaClienteInputSchema>;

export const EmpresaClienteListResponseSchema = ApiEnvelopeSchema(z.array(EmpresaClienteSchema));
export const EmpresaClienteResponseSchema = ApiEnvelopeSchema(EmpresaClienteSchema);
export const EmpresaClienteDeleteResponseSchema = ApiEnvelopeSchema(z.object({ id: z.string() }));
