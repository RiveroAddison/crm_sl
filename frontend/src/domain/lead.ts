// filepath: src/domain/lead.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, OptionalUuidSchema, UuidSchema } from './api';

export const LeadFuenteSchema = z.enum(['REDES', 'WEB', 'LLAMADA', 'REFERIDO']);
export type LeadFuente = z.infer<typeof LeadFuenteSchema>;

export const LeadCalificacionSchema = z.enum(['NUEVO', 'CALIFICADO', 'DESCARTADO']);
export type LeadCalificacion = z.infer<typeof LeadCalificacionSchema>;

/** Schema del backend: rif/email pueden venir vacios ("") o un string valido. */
const optionalRif = z
  .string()
  .regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/)
  .optional()
  .or(z.literal(''));
const optionalEmail = z.string().email().optional().or(z.literal(''));

export const LeadSchema = z.object({
  id: z.string(),
  empresaId: UuidSchema,
  cuentaComercialId: z.string().nullable().optional(),
  empresaClienteId: z.string().nullable().optional(),
  nombreContacto: z.string(),
  empresaNombre: z.string(),
  rif: z.string().nullable(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  fuente: LeadFuenteSchema,
  estadoCalificacion: LeadCalificacionSchema,
  presupuesto: z.number().nullable(),
  necesidad: z.string().nullable(),
  autoridad: z.string().nullable(),
  tiempo: z.string().nullable(),
  vendedorId: UuidSchema,
  vendedor: z.object({
    id: UuidSchema,
    nombre: z.string(),
    email: z.string().email(),
  }),
  cuentaComercial: z.object({
    id: z.string(),
    nombre: z.string(),
    rif: z.string().nullable(),
  }).nullable().optional(),
  empresaCliente: z.object({
    id: z.string(),
    nombre: z.string(),
    rif: z.string().nullable(),
  }).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Lead = z.infer<typeof LeadSchema>;

export const LeadInputSchema = z.object({
  nombreContacto: z.string().min(2),
  empresaNombre: z.string().min(2),
  rif: optionalRif,
  email: optionalEmail,
  telefono: z.string().optional(),
  fuente: LeadFuenteSchema,
  estadoCalificacion: LeadCalificacionSchema.optional(),
  presupuesto: z.number().min(0).optional(),
  necesidad: z.string().optional(),
  autoridad: z.string().optional(),
  tiempo: z.string().optional(),
  vendedorId: UuidSchema.optional(),
  cuentaComercialId: OptionalUuidSchema,
  empresaClienteId: UuidSchema.optional(),
});
export type LeadInput = z.infer<typeof LeadInputSchema>;

export const LeadPatchSchema = LeadInputSchema.partial();
export type LeadPatch = z.infer<typeof LeadPatchSchema>;

export const LeadListResponseSchema = ApiEnvelopeSchema(z.array(LeadSchema));
export const LeadResponseSchema = ApiEnvelopeSchema(LeadSchema);
export const LeadDeleteResponseSchema = ApiEnvelopeSchema(z.object({ id: z.string() }));

/** /leads/:id/convert devuelve una Oportunidad cruda del backend. */
export const LeadConvertResponseSchema = ApiEnvelopeSchema(
  z.object({
    id: z.string(),
    leadId: z.string().nullable().optional(),
    etapa: z.string().optional(),
  }),
);
