// filepath: src/domain/visita.ts
import { z } from 'zod';
import { ApiEnvelopeSchema } from './api';

export const EstadoVisitaSchema = z.enum(['PLANIFICADO', 'PENDIENTE', 'VISITADO', 'CANCELADO']);
export type EstadoVisita = z.infer<typeof EstadoVisitaSchema>;

export const VisitaGpsSchema = z.object({
  id: z.string(),
  empresaId: z.string().optional(),
  vendedorId: z.string().optional(),
  vendedorNombre: z.string(),
  clienteRazonSocial: z.string(),
  rif: z.string(),
  semana: z.number().int().min(1).max(4),
  dia: z.string(),
  estado: EstadoVisitaSchema,
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  comentario: z.string().nullable().optional(),
  fechaHora: z.string(),
});
export type VisitaGps = z.infer<typeof VisitaGpsSchema>;

export const CheckInInputSchema = z.object({
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/),
  clienteRazonSocial: z.string().min(1),
  semana: z.number().int().min(1).max(4),
  dia: z.string().min(1),
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  comentario: z.string().max(500).optional(),
});
export type CheckInInput = z.infer<typeof CheckInInputSchema>;

export const VisitaListResponseSchema = ApiEnvelopeSchema(z.array(VisitaGpsSchema));
export const VisitaResponseSchema = ApiEnvelopeSchema(VisitaGpsSchema);
