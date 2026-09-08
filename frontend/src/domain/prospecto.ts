// filepath: src/domain/prospecto.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, OptionalUuidSchema, UuidSchema } from './api';

export const EtapaOportunidadSchema = z.enum(['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO']);
export type EtapaOportunidad = z.infer<typeof EtapaOportunidadSchema>;

export const TipoActividadOportunidadSchema = z.enum(['CAPTACION', 'SEGUIMIENTO', 'LLAMADA', 'EMAIL', 'VISITA', 'REUNION', 'NOTA', 'WHATSAPP']);
export type TipoActividadOportunidad = z.infer<typeof TipoActividadOportunidadSchema>;

export const ActividadOportunidadSchema = z.object({
  id: z.string(),
  oportunidadId: z.string(),
  empresaId: z.string(),
  autorId: z.string(),
  tipo: TipoActividadOportunidadSchema,
  descripcion: z.string(),
  fecha: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  autor: z.object({ id: z.string(), nombre: z.string() }),
});
export type ActividadOportunidad = z.infer<typeof ActividadOportunidadSchema>;

export const CreateActividadOportunidadInputSchema = z.object({
  tipo: TipoActividadOportunidadSchema,
  descripcion: z.string().min(5),
  fecha: z.string().optional(),
});
export type CreateActividadOportunidadInput = z.infer<typeof CreateActividadOportunidadInputSchema>;

export const OportunidadSchema = z.object({
  id: z.string(),
  empresaId: UuidSchema.optional(),
  cuentaComercialId: z.string().nullable().optional(),
  clienteCorporativoId: z.string().nullable().optional(),
  vendedorId: UuidSchema.optional(),
  vendedorNombre: z.string(),
  titulo: z.string().min(1),
  rubro: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  razonSocial: z.string().min(1),
  rif: z.string().min(1),
  etapa: EtapaOportunidadSchema,
  valorEstimado: z.number().min(0),
  fechaContacto: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  actividades: z.array(ActividadOportunidadSchema).optional(),
}).passthrough();
export type Oportunidad = z.infer<typeof OportunidadSchema>;

export const CrearOportunidadSchema = z.object({
  razonSocial: z.string().min(2),
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/),
  titulo: z.string().min(3),
  rubro: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  etapa: EtapaOportunidadSchema.default('NUEVO'),
  valorEstimado: z.number().min(0),
  fechaContacto: z.string().min(1),
  vendedorNombre: z.string().min(1),
  cuentaComercialId: OptionalUuidSchema,
});
export type CrearOportunidadForm = z.infer<typeof CrearOportunidadSchema>;

export const UpdateEtapaInputSchema = z.object({ etapa: EtapaOportunidadSchema });
export type UpdateEtapaInput = z.infer<typeof UpdateEtapaInputSchema>;

export const OportunidadListResponseSchema = ApiEnvelopeSchema(z.array(OportunidadSchema));
export const OportunidadResponseSchema = ApiEnvelopeSchema(OportunidadSchema);
export const OportunidadDeleteResponseSchema = ApiEnvelopeSchema(z.object({ id: z.string() }));
