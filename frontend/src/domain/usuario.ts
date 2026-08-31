// filepath: src/domain/usuario.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, RolSchema, UuidSchema } from './api';

export const EmpresaSchema = z.object({
  id: UuidSchema,
  nombre: z.string().min(1),
  profitDbHost: z.string().nullable().optional(),
  profitDbName: z.string().nullable().optional(),
  profitDbUser: z.string().nullable().optional(),
  profitDbPassword: z.string().nullable().optional(),
  activo: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Empresa = z.infer<typeof EmpresaSchema>;

export const EmpresaInputSchema = z.object({
  nombre: z.string().min(1).max(100),
  profitDbHost: z.string().max(100).nullable().optional(),
  profitDbName: z.string().max(100).nullable().optional(),
  profitDbUser: z.string().max(100).nullable().optional(),
  profitDbPassword: z.string().max(100).nullable().optional(),
  activo: z.boolean().default(true),
});
export type EmpresaInput = z.infer<typeof EmpresaInputSchema>;

export const TestConexionInputSchema = z.object({
  host: z.string().min(1),
  name: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
});
export type TestConexionInput = z.infer<typeof TestConexionInputSchema>;
export const TestConexionResponseSchema = ApiEnvelopeSchema(
  z.object({ connected: z.boolean(), message: z.string() }),
);

export const UsuarioEmpresaSchema = z.object({
  empresaId: UuidSchema,
  empresaNombre: z.string(),
  rol: RolSchema,
  activo: z.boolean(),
});
export type UsuarioEmpresa = z.infer<typeof UsuarioEmpresaSchema>;

export const UsuarioSchema = z.object({
  id: UuidSchema,
  nombre: z.string(),
  email: z.string().email(),
  activo: z.boolean(),
  createdAt: z.string().optional(),
  empresas: z.array(UsuarioEmpresaSchema),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const UsuarioInputSchema = z.object({
  nombre: z.string().min(1).max(100),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  activo: z.boolean().default(true),
  empresas: z
    .array(z.object({ empresaId: UuidSchema, rol: RolSchema }))
    .default([]),
});
export type UsuarioInput = z.infer<typeof UsuarioInputSchema>;

export const UsuarioUpdateInputSchema = z.object({
  nombre: z.string().min(1).max(100),
  email: z.string().email().max(100),
  password: z.string().max(100).nullable().optional(),
  activo: z.boolean(),
  empresas: z
    .array(z.object({ empresaId: UuidSchema, rol: RolSchema }))
    .default([]),
});
export type UsuarioUpdateInput = z.infer<typeof UsuarioUpdateInputSchema>;

export const UsuarioListResponseSchema = ApiEnvelopeSchema(z.array(UsuarioSchema));
export const UsuarioResponseSchema = ApiEnvelopeSchema(UsuarioSchema);

export const EmpresaListResponseSchema = ApiEnvelopeSchema(z.array(EmpresaSchema));
export const EmpresaResponseSchema = ApiEnvelopeSchema(EmpresaSchema);
export const EmpresaDeleteResponseSchema = ApiEnvelopeSchema(
  z.object({ message: z.string() }),
);

/** --- Profit --- */

export const ProfitSyncInputSchema = z.object({ empresaId: UuidSchema.optional() });
export type ProfitSyncInput = z.infer<typeof ProfitSyncInputSchema>;

export const ProfitSyncResultSchema = z.object({
  success: z.boolean(),
  empresa: z.string().optional(),
  inserted: z.number().optional(),
  updated: z.number().optional(),
  error: z.string().optional(),
});
export type ProfitSyncResult = z.infer<typeof ProfitSyncResultSchema>;

export const ProfitSyncClientesResponseSchema = ApiEnvelopeSchema(
  z.object({
    message: z.string(),
    results: z.array(ProfitSyncResultSchema),
  }),
);
export const ProfitSyncVentasResponseSchema = ApiEnvelopeSchema(
  z.object({
    message: z.string(),
    results: z.array(ProfitSyncResultSchema),
  }),
);
export const ProfitSyncAllResponseSchema = ApiEnvelopeSchema(
  z.object({
    message: z.string(),
    clientes: z.array(ProfitSyncResultSchema),
    ventas: z.array(ProfitSyncResultSchema),
  }),
);

export const ProfitStatusSchema = z.object({
  id: UuidSchema,
  nombre: z.string(),
  profitDbHost: z.string().nullable(),
  profitDbName: z.string().nullable(),
  updatedAt: z.string(),
  configured: z.boolean(),
  lastSync: z.string().optional(),
});
export type ProfitStatus = z.infer<typeof ProfitStatusSchema>;
export const ProfitStatusResponseSchema = ApiEnvelopeSchema(z.array(ProfitStatusSchema));
