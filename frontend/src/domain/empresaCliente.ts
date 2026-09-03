// filepath: src/domain/empresaCliente.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, UuidSchema } from './api';

export const CuentaComercialSchema = z.object({
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
export type CuentaComercial = z.infer<typeof CuentaComercialSchema>;
export const EmpresaClienteSchema = CuentaComercialSchema;
export type EmpresaCliente = CuentaComercial;

export const CuentaComercialInputSchema = z.object({
  nombre: z.string().min(1).max(100),
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});
export type CuentaComercialInput = z.infer<typeof CuentaComercialInputSchema>;
export const EmpresaClienteInputSchema = CuentaComercialInputSchema;
export type EmpresaClienteInput = CuentaComercialInput;

export const CuentaComercialListResponseSchema = ApiEnvelopeSchema(z.array(CuentaComercialSchema));
export const CuentaComercialResponseSchema = ApiEnvelopeSchema(CuentaComercialSchema);
export const EmpresaClienteListResponseSchema = CuentaComercialListResponseSchema;
export const EmpresaClienteResponseSchema = CuentaComercialResponseSchema;
export const EmpresaClienteDeleteResponseSchema = ApiEnvelopeSchema(z.object({ id: z.string() }));
