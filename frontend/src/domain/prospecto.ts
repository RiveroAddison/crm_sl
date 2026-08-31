// filepath: src/domain/prospecto.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, UuidSchema } from './api';

export const EtapaOportunidadSchema = z.enum(['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO']);
export type EtapaOportunidad = z.infer<typeof EtapaOportunidadSchema>;

export const OportunidadSchema = z.object({
  id: z.string(),
  empresaId: UuidSchema.optional(),
  clienteCorporativoId: z.string().nullable().optional(),
  vendedorId: UuidSchema.optional(),
  vendedorNombre: z.string(),
  titulo: z.string().min(1),
  razonSocial: z.string().min(1),
  rif: z.string().min(1),
  etapa: EtapaOportunidadSchema,
  valorEstimado: z.number().min(0),
  fechaContacto: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Oportunidad = z.infer<typeof OportunidadSchema>;

export const CrearOportunidadSchema = z.object({
  razonSocial: z.string().min(2),
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/),
  titulo: z.string().min(3),
  etapa: EtapaOportunidadSchema.default('NUEVO'),
  valorEstimado: z.number().min(0),
  fechaContacto: z.string().min(1),
  vendedorNombre: z.string().min(1),
});
export type CrearOportunidadForm = z.infer<typeof CrearOportunidadSchema>;

export const UpdateEtapaInputSchema = z.object({ etapa: EtapaOportunidadSchema });
export type UpdateEtapaInput = z.infer<typeof UpdateEtapaInputSchema>;

export const OportunidadListResponseSchema = ApiEnvelopeSchema(z.array(OportunidadSchema));
export const OportunidadResponseSchema = ApiEnvelopeSchema(OportunidadSchema);
export const OportunidadDeleteResponseSchema = ApiEnvelopeSchema(z.object({ id: z.string() }));
