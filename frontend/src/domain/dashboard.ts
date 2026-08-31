// filepath: src/domain/dashboard.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, UuidSchema } from './api';

export const DashboardMetricsSchema = z.object({
  clientes: z.number().int().nonnegative(),
  clientesActivos: z.number().int().nonnegative(),
  crossSelling: z.number().int().nonnegative(),
});
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

export const DashboardVisitaSchema = z.object({
  semana: z.number().int(),
  dia: z.string(),
  fecha: z.union([z.string(), z.null()]).optional(),
  estado: z.string(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  comentario: z.string().nullable().optional(),
});
export type DashboardVisita = z.infer<typeof DashboardVisitaSchema>;

export const DashboardVentaSchema = z.object({
  mes: z.string(),
  semana: z.number().int(),
  fecha: z.string(),
  documento: z.string(),
  unidades: z.number().int(),
  monto: z.number(),
});
export type DashboardVenta = z.infer<typeof DashboardVentaSchema>;

export const DashboardClientSchema = z.object({
  id: z.string(),
  razonSocial: z.string(),
  rif: z.string(),
  estado: z.string(),
  vendedor: z.string(),
  visitas: z.array(DashboardVisitaSchema),
  ventas: z.array(DashboardVentaSchema),
});
export type DashboardClient = z.infer<typeof DashboardClientSchema>;

export const DashboardDataSchema = z.object({
  metrics: DashboardMetricsSchema,
  clients: z.array(DashboardClientSchema),
});
export const DashboardResponseSchema = ApiEnvelopeSchema(DashboardDataSchema);
export type DashboardData = z.infer<typeof DashboardDataSchema>;

