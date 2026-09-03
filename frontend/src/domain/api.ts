// filepath: src/domain/api.ts
// Tipos compartidos por TODOS los servicios y stores.

import { z } from 'zod';

/** UUID v1-v5. */
export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';
export const OptionalUuidSchema = z.preprocess(
  (value) => value === '' || value === EMPTY_UUID ? undefined : value,
  UuidSchema.optional(),
);

/** Cadena de fecha ISO-8601 (YYYY-MM-DD). */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'Fecha invalida (se esperaba ISO-8601)');
export type IsoDate = z.infer<typeof IsoDateSchema>;

/** Envelope que devuelve SIEMPRE el backend. */
export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    error: z.string().default(''),
  });
export type ApiEnvelope<T> = { success: true; data: T; error: string };

/** Roles de la plataforma. */
export const RolSchema = z.enum(['MASTER', 'ADMIN', 'VENDEDOR']);
export type Rol = z.infer<typeof RolSchema>;

/** Error normalizado que lanzan los servicios. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
