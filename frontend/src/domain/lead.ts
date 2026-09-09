import { z } from 'zod';
import { ApiEnvelopeSchema, OptionalUuidSchema, UuidSchema } from './api';

// Enums
export const LeadFuenteSchema = z.enum(['WEB', 'MENSAJE', 'CORREO', 'REUNION', 'LLAMADA', 'REFERIDO', 'REDES']);
export type LeadFuente = z.infer<typeof LeadFuenteSchema>;

export const LeadCalificacionSchema = z.enum(['NUEVO', 'CALIFICADO', 'DESCARTADO']);
export type LeadCalificacion = z.infer<typeof LeadCalificacionSchema>;

export const EstadoLeadSchema = z.enum(['ACTIVO', 'APROBADO', 'RECHAZADO', 'EN_PROCESO']);
export type EstadoLead = z.infer<typeof EstadoLeadSchema>;

export const TipoActividadLeadSchema = z.enum(['CAPTACION', 'SEGUIMIENTO', 'LLAMADA', 'EMAIL', 'VISITA', 'REUNION', 'NOTA', 'WHATSAPP']);
export type TipoActividadLead = z.infer<typeof TipoActividadLeadSchema>;

export const TipoRifSchema = z.enum(['V', 'J', 'E', 'G', 'R', 'P']);
export type TipoRif = z.infer<typeof TipoRifSchema>;

// Lead Schema
export const LeadSchema = z.object({
  id: z.string(),
  empresaId: UuidSchema,
  cuentaComercialId: z.string().nullable().optional(),
  empresaClienteId: z.string().nullable().optional(),
  
  // Datos empresa
  empresaNombre: z.string(),
  rif: z.string().nullable(),
  direccion: z.string().nullable().optional(),
  telefonoEmpresa: z.string().nullable().optional(),
  tipoIndustria: z.string().nullable().optional(),
  
  // Datos contacto
  cedulaContacto: z.string().nullable().optional(),
  nombreContacto: z.string(),
  cargoContacto: z.string().nullable().optional(),
  telefonoContacto: z.string().nullable().optional(),
  emailContacto: z.string().nullable().optional(),
  
  // Captación
  fuente: LeadFuenteSchema,
  fechaCaptacion: z.string(),
  descripcionCaptacion: z.string().nullable().optional(),
  
  // Estado
  estado: EstadoLeadSchema,
  estadoCalificacion: LeadCalificacionSchema,
  
  // BANT
  presupuesto: z.number().nullable(),
  necesidad: z.string().nullable(),
  autoridad: z.string().nullable(),
  tiempo: z.string().nullable(),
  
  // Asignación
  vendedorId: UuidSchema,
  rubroOriginal: z.string().nullable().optional(),
  
  // Relaciones
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
  oportunidades: z.array(z.object({
    id: z.string(),
    rubro: z.string().nullable(),
    valorEstimado: z.number(),
    etapa: z.string(),
  })).optional(),
  actividades: z.array(z.object({
    id: z.string(),
    tipo: TipoActividadLeadSchema,
    descripcion: z.string(),
    fecha: z.string(),
    autor: z.object({ id: z.string(), nombre: z.string() }),
  })).optional(),
  rechazos: z.array(z.object({
    id: z.string(),
    rubro: z.string(),
    motivo: z.string(),
    createdAt: z.string(),
  })).optional(),
  aprobaciones: z.array(z.object({
    id: z.string(),
    rubro: z.string(),
    aprobadoBy: z.string(),
    oportunidadId: z.string().nullable().optional(),
    createdAt: z.string(),
  })).optional(),
  crossSelling: z.object({
    combustible: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    lubricantes: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    autopartes: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    transporte: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    alimentosBalanceados: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    alimentosCongelados: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
  }).nullable().optional(),
  
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();
export type Lead = z.infer<typeof LeadSchema>;

// Lead Input
export const LeadInputSchema = z.object({
  empresaNombre: z.string().min(2),
  tipoRif: TipoRifSchema.optional(),
  numeroRif: z.string().regex(/^\d{8,9}$/).optional(),
  digitoVerificador: z.string().regex(/^\d$/).optional(),
  rif: z.string().optional(),
  direccion: z.string().optional(),
  telefonoEmpresa: z.string().optional(),
  tipoIndustria: z.string().optional(),
  cedulaContacto: z.string().optional(),
  nombreContacto: z.string().min(2),
  cargoContacto: z.string().optional(),
  telefonoContacto: z.string().optional(),
  emailContacto: z.string().email().optional().or(z.literal('')),
  fuente: LeadFuenteSchema,
  fechaCaptacion: z.string().optional(),
  descripcionCaptacion: z.string().optional(),
  estadoCalificacion: LeadCalificacionSchema.optional(),
  vendedorId: UuidSchema.optional(),
  cuentaComercialId: OptionalUuidSchema,
  empresaClienteId: UuidSchema.optional(),
});
export type LeadInput = z.infer<typeof LeadInputSchema>;

export const LeadPatchSchema = LeadInputSchema.partial();
export type LeadPatch = z.infer<typeof LeadPatchSchema>;

// Actividad Schema
export const ActividadLeadSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  tipo: TipoActividadLeadSchema,
  descripcion: z.string(),
  fecha: z.string(),
  autor: z.object({ id: z.string(), nombre: z.string() }),
  createdAt: z.string(),
});
export type ActividadLead = z.infer<typeof ActividadLeadSchema>;

export const CreateActividadInputSchema = z.object({
  tipo: TipoActividadLeadSchema,
  descripcion: z.string().min(5),
  fecha: z.string().optional(),
});
export type CreateActividadInput = z.infer<typeof CreateActividadInputSchema>;

// Rechazo Schema
export const LeadRechazoSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  rubro: z.string(),
  motivo: z.string(),
  createdAt: z.string(),
});
export type LeadRechazo = z.infer<typeof LeadRechazoSchema>;

// Aprobar Lead Input
export const AprobarLeadInputSchema = z.object({
  rubro: z.string().min(1),
  estimadoCompra: z.number().min(0),
  necesidadUnidades: z.number().min(1),
  fechaEstimadaCierre: z.string(),
  tipoClienteId: z.string().uuid(),
  vendedorAsignadoId: z.string().uuid(),
});
export type AprobarLeadInput = z.infer<typeof AprobarLeadInputSchema>;

// Rechazar Lead Input
export const RechazarLeadInputSchema = z.object({
  rubro: z.string().min(1),
  motivo: z.string().min(10),
});
export type RechazarLeadInput = z.infer<typeof RechazarLeadInputSchema>;

// Tipo Cliente Schema
export const TipoClienteSchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  nombre: z.string(),
  activo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TipoCliente = z.infer<typeof TipoClienteSchema>;

// Response Schemas
export const LeadListResponseSchema = ApiEnvelopeSchema(z.array(LeadSchema));
export const LeadResponseSchema = ApiEnvelopeSchema(LeadSchema);
export const LeadDeleteResponseSchema = ApiEnvelopeSchema(z.object({ id: z.string() }));
export const LeadConvertResponseSchema = ApiEnvelopeSchema(
  z.object({
    id: z.string(),
    leadId: z.string().nullable().optional(),
    etapa: z.string().optional(),
  }),
);
