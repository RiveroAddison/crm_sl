# Plan: Flujo Completo de Leads → Aprobación/Rechazo → Oportunidad

**Estado:** Pendiente de aprobación e implementación  
**Fecha:** 07/09/2026  
**Versión:** 1.0  

---

## 🎯 Objetivo

Implementar el flujo completo de Leads donde:
1. El vendedor **solo puede crear Leads** (ya no crea oportunidades directamente)
2. El Admin/Master **aprueba o rechaza** el lead por rubro
3. Al aprobar → se crea **Oportunidad** directamente con info adicional
4. Al rechazar → se guarda motivo, lead sigue disponible para otros rubros
5. Se integra **CrossSelling** para saber si el cliente ya compra en otras empresas
6. **Tipo de cliente** configurable por empresa (Productor, Estándar, etc.)

---

## 📋 Resumen de Decisiones de Diseño

| Decisión | Elección |
|----------|----------|
| Almacenamiento al aprobar | Oportunidad directa (Lead → Oportunidad) |
| Rechazo | Por rubro con motivo, lead disponible para otros |
| Tipo de cliente | Catálogo CRUD por empresa |
| RIF frontend | Separado (combo + número + dígito verificador) |
| RIF backend | Concatenado en campo `rif` |
| CrossSelling | Marcar rubro como COMPRA al aprobar |
| Asignación vendedor | Lead se asigna al creador; Oportunidad al vendedor del rubro aprobado |
| Visibilidad leads | Vendedor: solo sus leads. Admin/Master: todos |

---

## 📐 Arquitectura del Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE LEADS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                                                       │
│  │   VENDEDOR   │                                                       │
│  └──────┬───────┘                                                       │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────┐                          │
│  │  CREAR LEAD                               │                          │
│  │  • Datos empresa (RIF, razón social, etc) │                          │
│  │  • Datos contacto (cédula, nombre, etc)   │                          │
│  │  • Actividad inicial (fuente, fecha, nota)│                          │
│  │  • vendedorId = usuario.id (automático)   │                          │
│  └──────────────┬───────────────────────────┘                          │
│                  │                                                       │
│                  ▼                                                       │
│  ┌──────────────────────────────────────────┐                          │
│  │  LEAD ESTADO: ACTIVO                      │                          │
│  │  • Disponible para TODOS los rubros       │                          │
│  │  • Visible en bandeja Admin               │                          │
│  │  • Vendedor solo ve sus leads             │                          │
│  └──────────────┬───────────────────────────┘                          │
│                  │                                                       │
│         ┌────────┴────────┐                                            │
│         ▼                 ▼                                            │
│  ┌─────────────┐   ┌─────────────┐                                    │
│  │  APROBAR    │   │  RECHAZAR   │                                    │
│  │  (Admin)    │   │  (Admin)    │                                    │
│  └──────┬──────┘   └──────┬──────┘                                    │
│         │                  │                                            │
│         ▼                  ▼                                            │
│  ┌─────────────────┐  ┌──────────────────────┐                        │
│  │ CREAR            │  │ GUARDAR RECHAZO      │                        │
│  │ OPORTUNIDAD      │  │ • Motivo             │                        │
│  │ + info adicional │  │ • Rubro rechazado    │                        │
│  │ vendedor = admin │  │ • Lead sigue activo  │                        │
│  │   elige vendedor │  │   para otros rubros  │                        │
│  └─────────────────┘  └──────────────────────┘                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Inventario de Cambios

### Backend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/prisma/schema.prisma` | ✏️ | Agregar campos al Lead, modelo Actividad, LeadRechazo, TipoCliente |
| `backend/src/services/leads.service.ts` | ✏️ | Modificar createLead, agregar aprobarLead, rechazarLead |
| `backend/src/controllers/leads.controller.ts` | ✏️ | Agregar endpoints aprobación/rechazo |
| `backend/src/routes/leads.routes.ts` | ✏️ | Agregar rutas de aprobación/rechazo |
| `backend/src/services/actividades.service.ts` | ➕ | CRUD de actividades del lead |
| `backend/src/controllers/actividades.controller.ts` | ➕ | Endpoints de actividades |
| `backend/src/services/tiposCliente.service.ts` | ➕ | CRUD de tipos de cliente por empresa |
| `backend/src/controllers/tiposCliente.controller.ts` | ➕ | Endpoints de tipos de cliente |
| `backend/src/routes/tiposCliente.routes.ts` | ➕ | Rutas de tipos de cliente |

### Frontend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `frontend/src/components/common/LeadCaptureModal.vue` | ➕ | Modal de creación de lead (vendedor) |
| `frontend/src/components/seller/SellerHeader.vue` | ✏️ | Cambiar botón a "Captar Lead" |
| `frontend/src/views/SellerDashboard.vue` | ✏️ | Usar LeadCaptureModal en vez de ProspectModal |
| `frontend/src/views/AdminDashboard.vue` | ✏️ | Agregar modales aprobación/rechazo, mostrar CrossSelling |
| `frontend/src/domain/lead.ts` | ✏️ | Agregar schemas de Actividad, LeadRechazo, TipoCliente |
| `frontend/src/services/actividades.api.ts` | ➕ | API de actividades |
| `frontend/src/services/tiposCliente.api.ts` | ➕ | API de tipos de cliente |
| `frontend/src/stores/leads.ts` | ✏️ | Agregar funciones de aprobación/rechazo |
| `frontend/src/components/common/ProspectModal.vue` | 🗑️ | Eliminar (ya no se usa) |

---

## 🔧 FASE 1: Schema Prisma (Backend)

### 1.1 Nuevos Enums

```prisma
enum EstadoLead {
  ACTIVO        // Lead creado, pendiente de revisión
  APROBADO      // Lead aprobado, se creó oportunidad
  RECHAZADO     // Lead rechazado para TODOS los rubros
  EN_PROCESO    // Lead en proceso de negociación
}

enum TipoActividadLead {
  CAPTACION
  SEGUIMIENTO
  LLAMADA
  EMAIL
  VISITA
  REUNION
  NOTA
  WHATSAPP
}
```

### 1.2 Modelo Lead (modificar)

```prisma
model Lead {
  id                  String                @id @default(uuid())
  empresaId           String
  cuentaComercialId   String?
  
  // Datos empresa (existentes modificados)
  empresaNombre       String
  rif                 String?               // Guardado concatenado: "J-12345678-9"
  direccion           String?               // NUEVO
  telefonoEmpresa     String?               // NUEVO (renombrado de 'telefono' actual)
  tipoIndustria       String?               // NUEVO
  
  // Datos contacto (NUEVOS)
  cedulaContacto      String?               // NUEVO
  nombreContacto      String                // Existente
  cargoContacto       String?               // NUEVO
  telefonoContacto    String?               // NUEVO
  emailContacto       String?               // NUEVO
  
  // Datos captación
  fuente              FuenteLead
  fechaCaptacion      DateTime              // NUEVO
  descripcionCaptacion String?              // NUEVO
  
  // Estado y calificación
  estado              EstadoLead            // NUEVO (default: ACTIVO)
  estadoCalificacion  EstadoCalificacionLead @default(NUEVO)
  
  // BANT (mantener por compatibilidad)
  presupuesto         Float?
  necesidad           String?
  autoridad           String?
  tiempo              String?
  
  // Asignación
  vendedorId          String                // Vendedor que creó el lead
  rubroOriginal       String?               // Rubro donde se creó (referencia)
  
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt

  // Relaciones
  empresa             Empresa               @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  cuentaComercial     CuentaComercial?      @relation(fields: [cuentaComercialId], references: [id], onDelete: SetNull)
  vendedor            Usuario               @relation(fields: [vendedorId], references: [id], onDelete: Cascade)
  actividades         ActividadLead[]
  rechazos            LeadRechazo[]
  oportunidades       Oportunidad[]

  @@index([empresaId, estado])
  @@index([empresaId, vendedorId])
  @@index([cuentaComercialId])
}
```

### 1.3 Modelo ActividadLead (NUEVO)

```prisma
model ActividadLead {
  id          String              @id @default(uuid())
  leadId      String
  empresaId   String
  autorId     String
  tipo        TipoActividadLead
  descripcion String
  fecha       DateTime            @default(now())
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  lead        Lead                @relation(fields: [leadId], references: [id], onDelete: Cascade)
  autor       Usuario             @relation(fields: [autorId], references: [id], onDelete: Cascade)

  @@index([leadId, fecha])
  @@index([empresaId, leadId])
}
```

### 1.4 Modelo LeadRechazo (NUEVO)

```prisma
model LeadRechazo {
  id          String   @id @default(uuid())
  leadId      String
  empresaId   String
  rubro       String   // Rubro que fue rechazado
  motivo      String   // Por qué se rechazó
  rechazadoBy String   // Quién rechazó (usuarioId)
  createdAt   DateTime @default(now())

  lead        Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@unique([leadId, rubro])
  @@index([leadId])
}
```

### 1.5 Modelo TipoCliente (NUEVO)

```prisma
model TipoCliente {
  id        String   @id @default(uuid())
  empresaId String
  nombre    String   // "Productor", "Estándar", etc.
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  empresa   Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)

  @@unique([empresaId, nombre])
  @@index([empresaId])
}
```

### 1.6 Relaciones en Empresa y Usuario

```prisma
model Empresa {
  // ... campos existentes ...
  tiposCliente TipoCliente[]
  // ... relaciones existentes ...
}

model Usuario {
  // ... campos existentes ...
  actividadesLead ActividadLead[]
  // ... relaciones existentes ...
}
```

### 1.7 Migración

```bash
cd backend
npx prisma migrate dev --name add_lead_flujo_completo
npx prisma generate
```

---

## 🔧 FASE 2: Backend Services

### 2.1 `actividades.service.ts` (NUEVO)

**Archivo:** `backend/src/services/actividades.service.ts`

```typescript
import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CreateActividadInput = {
  tipo: 'CAPTACION' | 'SEGUIMIENTO' | 'LLAMADA' | 'EMAIL' | 'VISITA' | 'REUNION' | 'NOTA' | 'WHATSAPP';
  descripcion: string;
  fecha?: string;
};

export async function listActividades(context: RequestContext, leadId: string) {
  // Validar que el lead pertenece al tenant
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, empresaId: context.tenantId }
  });
  if (!lead) throw new Error('Lead no encontrado');

  return prisma.actividadLead.findMany({
    where: { leadId },
    include: { autor: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' }
  });
}

export async function createActividad(context: RequestContext, leadId: string, input: CreateActividadInput) {
  // Validar que el lead pertenece al tenant
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, empresaId: context.tenantId }
  });
  if (!lead) throw new Error('Lead no encontrado');

  // Validar que el vendedor solo puede crear actividades en sus leads
  if (context.rol === 'VENDEDOR' && lead.vendedorId !== context.userId) {
    throw new Error('No tienes permiso para crear actividades en este lead');
  }

  return prisma.actividadLead.create({
    data: {
      leadId,
      empresaId: context.tenantId,
      autorId: context.userId,
      tipo: input.tipo,
      descripcion: input.descripcion,
      fecha: input.fecha ? new Date(input.fecha) : new Date()
    },
    include: { autor: { select: { id: true, nombre: true } } }
  });
}
```

### 2.2 `tiposCliente.service.ts` (NUEVO)

**Archivo:** `backend/src/services/tiposCliente.service.ts`

```typescript
import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';

export type CreateTipoClienteInput = { nombre: string };
export type UpdateTipoClienteInput = { nombre?: string; activo?: boolean };

export async function listTiposCliente(context: RequestContext) {
  return prisma.tipoCliente.findMany({
    where: { empresaId: context.tenantId, activo: true },
    orderBy: { nombre: 'asc' }
  });
}

export async function createTipoCliente(context: RequestContext, input: CreateTipoClienteInput) {
  // Solo ADMIN y MASTER pueden crear
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso');

  return prisma.tipoCliente.create({
    data: { empresaId: context.tenantId, nombre: input.nombre }
  });
}

export async function updateTipoCliente(context: RequestContext, id: string, input: UpdateTipoClienteInput) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso');

  const existing = await prisma.tipoCliente.findFirst({
    where: { id, empresaId: context.tenantId }
  });
  if (!existing) throw new Error('Tipo de cliente no encontrado');

  return prisma.tipoCliente.update({ where: { id }, data: input });
}

export async function deleteTipoCliente(context: RequestContext, id: string) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso');

  const existing = await prisma.tipoCliente.findFirst({
    where: { id, empresaId: context.tenantId }
  });
  if (!existing) throw new Error('Tipo de cliente no encontrado');

  // Soft delete
  return prisma.tipoCliente.update({ where: { id }, data: { activo: false } });
}
```

### 2.3 `leads.service.ts` (MODIFICAR)

**Archivo:** `backend/src/services/leads.service.ts`

```typescript
import { prisma } from '../lib/prisma.js';
import type { RequestContext } from '../middleware/auth.js';
import { resolveCuentaComercial } from './cuentasComerciales.service.js';

export type LeadInput = {
  // Datos empresa
  empresaNombre: string;
  tipoRif?: string;          // V, J, E, G, R, P
  numeroRif?: string;        // 8-9 dígitos
  digitoVerificador?: string; // 1 dígito
  rif?: string;              // Para compatibilidad, se construye de los 3 anteriores
  direccion?: string;
  telefonoEmpresa?: string;
  tipoIndustria?: string;
  
  // Datos contacto
  cedulaContacto?: string;
  nombreContacto: string;
  cargoContacto?: string;
  telefonoContacto?: string;
  emailContacto?: string;
  
  // Captación
  fuente: 'WEB' | 'MENSAJE' | 'CORREO' | 'REUNION' | 'LLAMADA' | 'REFERIDO' | 'REDES';
  fechaCaptacion?: string;
  descripcionCaptacion?: string;
  
  // Otros
  vendedorId?: string;
  cuentaComercialId?: string;
  empresaClienteId?: string;
};

export type AprobarLeadInput = {
  rubro: string;
  estimadoCompra: number;
  necesidadUnidades: number;
  fechaEstimadaCierre: string;
  tipoClienteId: string;
  vendedorAsignadoId: string;
};

export type RechazarLeadInput = {
  rubro: string;
  motivo: string;
};

// Helper para concatenar RIF
function buildRif(input: LeadInput): string | null {
  if (input.rif) return input.rif;
  if (input.tipoRif && input.numeroRif && input.digitoVerificador) {
    return `${input.tipoRif}-${input.numeroRif}-${input.digitoVerificador}`;
  }
  return null;
}

const include = {
  vendedor: { select: { id: true, nombre: true, email: true } },
  cuentaComercial: { select: { id: true, nombre: true, rif: true } },
  actividades: {
    include: { autor: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' as const }
  },
  rechazos: true
} as const;

export async function listLeads(context: RequestContext) {
  return prisma.lead.findMany({
    where: {
      empresaId: context.tenantId,
      // Vendedor solo ve sus leads
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    },
    include,
    orderBy: { createdAt: 'desc' }
  });
}

export async function createLead(context: RequestContext, input: LeadInput) {
  // Si es vendedor, se asigna automáticamente
  const vendedorId = context.rol === 'VENDEDOR' ? context.userId : (input.vendedorId || context.userId);
  const rif = buildRif(input);

  const cuentaComercial = await resolveCuentaComercial(context, {
    id: input.cuentaComercialId || input.empresaClienteId,
    nombre: input.empresaNombre,
    rif: rif || undefined,
    email: input.emailContacto,
    telefono: input.telefonoEmpresa,
  });

  return prisma.lead.create({
    data: {
      empresaNombre: input.empresaNombre,
      rif: rif || null,
      direccion: input.direccion || null,
      telefonoEmpresa: input.telefonoEmpresa || null,
      tipoIndustria: input.tipoIndustria || null,
      cedulaContacto: input.cedulaContacto || null,
      nombreContacto: input.nombreContacto,
      cargoContacto: input.cargoContacto || null,
      telefonoContacto: input.telefonoContacto || null,
      emailContacto: input.emailContacto || null,
      fuente: input.fuente,
      fechaCaptacion: input.fechaCaptacion ? new Date(input.fechaCaptacion) : new Date(),
      descripcionCaptacion: input.descripcionCaptacion || null,
      estado: 'ACTIVO',
      estadoCalificacion: 'NUEVO',
      vendedorId,
      empresaId: context.tenantId,
      cuentaComercialId: cuentaComercial?.id || null,
    },
    include,
  });
}

export async function updateLead(context: RequestContext, id: string, input: Partial<LeadInput>) {
  const existing = await prisma.lead.findFirst({
    where: {
      id,
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    }
  });
  if (!existing) throw new Error('Lead no encontrado');

  const rif = buildRif(input as LeadInput);

  return prisma.lead.update({
    where: { id },
    data: {
      empresaNombre: input.empresaNombre ?? undefined,
      rif: rif ?? undefined,
      direccion: input.direccion ?? undefined,
      telefonoEmpresa: input.telefonoEmpresa ?? undefined,
      tipoIndustria: input.tipoIndustria ?? undefined,
      cedulaContacto: input.cedulaContacto ?? undefined,
      nombreContacto: input.nombreContacto ?? undefined,
      cargoContacto: input.cargoContacto ?? undefined,
      telefonoContacto: input.telefonoContacto ?? undefined,
      emailContacto: input.emailContacto ?? undefined,
      fuente: input.fuente ?? undefined,
      fechaCaptacion: input.fechaCaptacion ? new Date(input.fechaCaptacion) : undefined,
      descripcionCaptacion: input.descripcionCaptacion ?? undefined,
    },
    include,
  });
}

export async function deleteLead(context: RequestContext, id: string) {
  const existing = await prisma.lead.findFirst({
    where: {
      id,
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    }
  });
  if (!existing) throw new Error('Lead no encontrado');
  await prisma.lead.delete({ where: { id } });
  return { id };
}

export async function aprobarLead(context: RequestContext, id: string, input: AprobarLeadInput) {
  // Solo ADMIN y MASTER pueden aprobar
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso para aprobar leads');

  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: context.tenantId },
    include: { vendedor: true, cuentaComercial: true }
  });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estado === 'APROBADO') throw new Error('El lead ya fue aprobado');

  // Verificar que el rubro no esté rechazado
  const rechazoExistente = await prisma.leadRechazo.findUnique({
    where: { leadId_rubro: { leadId: id, rubro: input.rubro } }
  });
  if (rechazoExistente) throw new Error(`El lead fue rechazado para el rubro ${input.rubro}`);

  // Verificar CrossSelling
  let crossSellingInfo = null;
  if (lead.rif) {
    const clienteCorporativo = await prisma.clienteCorporativo.findUnique({
      where: { rif: lead.rif },
      include: { crossSellingMatriz: true }
    });
    crossSellingInfo = clienteCorporativo?.crossSellingMatriz;
  }

  return prisma.$transaction(async (tx) => {
    // Crear Oportunidad
    const oportunidad = await tx.oportunidad.create({
      data: {
        empresaId: lead.empresaId,
        cuentaComercialId: lead.cuentaComercialId,
        leadId: lead.id,
        vendedorId: input.vendedorAsignadoId,
        vendedorNombre: '', // Se actualizará con el nombre del vendedor
        titulo: `${input.rubro} - ${lead.empresaNombre}`,
        rubro: input.rubro,
        razonSocial: lead.empresaNombre,
        rif: lead.rif || 'J-00000000-0',
        etapa: 'NUEVO',
        valorEstimado: input.estimadoCompra,
        fechaContacto: new Date(),
      }
    });

    // Actualizar estado del lead
    await tx.lead.update({
      where: { id: lead.id },
      data: { estado: 'APROBADO' }
    });

    // Actualizar CrossSelling si existe
    if (crossSellingInfo) {
      const updateData: Record<string, string> = {};
      // Mapear rubro a campo de CrossSellingMatriz
      const rubroToField: Record<string, string> = {
        'COMBUSTIBLE': 'combustible',
        'LUBRICANTES': 'lubricantes',
        'AUTOPARTES': 'autopartes',
        'TRANSPORTE': 'transporte',
        'ALIMENTOS_BALANCEADOS': 'alimentosBalanceados',
        'ALIMENTOS_CONGELADOS': 'alimentosCongelados',
      };
      const field = rubroToField[input.rubro.toUpperCase()];
      if (field) {
        updateData[field] = 'COMPRA';
        await tx.crossSellingMatriz.update({
          where: { clienteCorporativoId: crossSellingInfo.clienteCorporativoId },
          data: updateData
        });
      }
    }

    return oportunidad;
  });
}

export async function rechazarLead(context: RequestContext, id: string, input: RechazarLeadInput) {
  if (context.rol === 'VENDEDOR') throw new Error('No tienes permiso para rechazar leads');

  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: context.tenantId }
  });
  if (!lead) throw new Error('Lead no encontrado');

  return prisma.$transaction(async (tx) => {
    // Crear registro de rechazo
    await tx.leadRechazo.create({
      data: {
        leadId: id,
        empresaId: context.tenantId,
        rubro: input.rubro,
        motivo: input.motivo,
        rechazadoBy: context.userId
      }
    });

    // Verificar si el lead tiene rechazos para TODOS los rubros
    const rechazos = await tx.leadRechazo.findMany({
      where: { leadId: id }
    });

    // Si tiene rechazos para múltiples rubros, marcar como RECHAZADO
    // (Esto es simplificado - en producción podrías tener una lógica más compleja)
    if (rechazos.length >= 3) { // Asumiendo 3 rubros principales
      await tx.lead.update({
        where: { id },
        data: { estado: 'RECHAZADO' }
      });
    }

    return { success: true, leadId: id, rubro: input.rubro };
  });
}

export async function getRechazosLead(context: RequestContext, leadId: string) {
  return prisma.leadRechazo.findMany({
    where: { leadId, empresaId: context.tenantId },
    orderBy: { createdAt: 'desc' }
  });
}
```

### 2.4 `leads.controller.ts` (MODIFICAR)

**Archivo:** `backend/src/controllers/leads.controller.ts`

```typescript
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import {
  convertLead,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
  aprobarLead,
  rechazarLead,
  getRechazosLead
} from '../services/leads.service.js';
import { listActividades, createActividad } from '../services/actividades.service.js';

const optionalUuid = z.preprocess(
  (value) => value === '' || value === '00000000-0000-0000-0000-000000000000' ? undefined : value,
  z.string().uuid().optional()
);

// Schema para crear lead
const leadSchema = z.object({
  // Datos empresa
  empresaNombre: z.string().min(2),
  tipoRif: z.enum(['V', 'J', 'E', 'G', 'R', 'P']).optional(),
  numeroRif: z.string().regex(/^\d{8,9}$/).optional(),
  digitoVerificador: z.string().regex(/^\d$/).optional(),
  rif: z.string().optional(),
  direccion: z.string().optional(),
  telefonoEmpresa: z.string().optional(),
  tipoIndustria: z.string().optional(),
  
  // Datos contacto
  cedulaContacto: z.string().optional(),
  nombreContacto: z.string().min(2),
  cargoContacto: z.string().optional(),
  telefonoContacto: z.string().optional(),
  emailContacto: z.string().email().optional().or(z.literal('')),
  
  // Captación
  fuente: z.enum(['WEB', 'MENSAJE', 'CORREO', 'REUNION', 'LLAMADA', 'REFERIDO', 'REDES']),
  fechaCaptacion: z.string().optional(),
  descripcionCaptacion: z.string().optional(),
  
  // Otros
  vendedorId: optionalUuid,
  cuentaComercialId: optionalUuid,
  empresaClienteId: optionalUuid,
});

// Schema para aprobar lead
const aprobarLeadSchema = z.object({
  rubro: z.string().min(1),
  estimadoCompra: z.number().min(0),
  necesidadUnidades: z.number().min(1),
  fechaEstimadaCierre: z.string(),
  tipoClienteId: z.string().uuid(),
  vendedorAsignadoId: z.string().uuid(),
});

// Schema para rechazar lead
const rechazarLeadSchema = z.object({
  rubro: z.string().min(1),
  motivo: z.string().min(10),
});

// Schema para crear actividad
const actividadSchema = z.object({
  tipo: z.enum(['CAPTACION', 'SEGUIMIENTO', 'LLAMADA', 'EMAIL', 'VISITA', 'REUNION', 'NOTA', 'WHATSAPP']),
  descripcion: z.string().min(5),
  fecha: z.string().optional(),
});

const patchSchema = leadSchema.partial();

function errorStatus(message: string) {
  if (message === 'Lead no encontrado') return 404;
  if (message.includes('Cuenta comercial')) return 409;
  if (message.includes('CALIFICADO') || message.includes('APROBADO')) return 409;
  if (message.includes('permiso')) return 403;
  return 500;
}

export async function list(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listLeads(context), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los leads' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Lead inválido' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    const newLead = await createLead(context, parsed.data);
    return res.status(201).json({ success: true, data: newLead, error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible crear el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function update(req: Request, res: Response) {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Lead inválido' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await updateLead(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible actualizar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await deleteLead(context, String(req.params.id)), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible eliminar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function promote(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await convertLead(context, String(req.params.id)), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible convertir el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function approve(req: Request, res: Response) {
  const parsed = aprobarLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await aprobarLead(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible aprobar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function reject(req: Request, res: Response) {
  const parsed = rechazarLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await rechazarLead(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible rechazar el lead';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}

export async function listRechazos(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await getRechazosLead(context, String(req.params.id)), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los rechazos' });
  }
}

export async function listActividadesEndpoint(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listActividades(context, String(req.params.id)), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar las actividades' });
  }
}

export async function createActividadEndpoint(req: Request, res: Response) {
  const parsed = actividadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Actividad inválida' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await createActividad(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible crear la actividad';
    return res.status(errorStatus(message)).json({ success: false, data: null, error: message });
  }
}
```

### 2.5 `routes/leads.routes.ts` (MODIFICAR)

**Archivo:** `backend/src/routes/leads.routes.ts`

```typescript
import { Router } from 'express';
import { list, create, update, remove, promote, approve, reject, listRechazos, listActividadesEndpoint, createActividadEndpoint } from '../controllers/leads.controller.js';

const router = Router();

router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/convert', promote);
router.post('/:id/aprobar', approve);
router.post('/:id/rechazar', reject);
router.get('/:id/rechazos', listRechazos);
router.get('/:id/actividades', listActividadesEndpoint);
router.post('/:id/actividades', createActividadEndpoint);

export default router;
```

### 2.6 `tiposCliente.controller.ts` (NUEVO)

**Archivo:** `backend/src/controllers/tiposCliente.controller.ts`

```typescript
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestContext } from '../middleware/auth.js';
import {
  listTiposCliente,
  createTipoCliente,
  updateTipoCliente,
  deleteTipoCliente
} from '../services/tiposCliente.service.js';

const createSchema = z.object({ nombre: z.string().min(2) });
const updateSchema = z.object({ nombre: z.string().min(2).optional(), activo: z.boolean().optional() });

export async function list(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await listTiposCliente(context), error: '' });
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar los tipos de cliente' });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.status(201).json({ success: true, data: await createTipoCliente(context, parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible crear el tipo de cliente';
    return res.status(message.includes('permiso') ? 403 : 500).json({ success: false, data: null, error: message });
  }
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await updateTipoCliente(context, String(req.params.id), parsed.data), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible actualizar el tipo de cliente';
    const status = message.includes('no encontrado') ? 404 : message.includes('permiso') ? 403 : 500;
    return res.status(status).json({ success: false, data: null, error: message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const context = await getRequestContext(req);
    if (!context) return res.status(401).json({ success: false, data: null, error: 'No autenticado' });
    return res.json({ success: true, data: await deleteTipoCliente(context, String(req.params.id)), error: '' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'No fue posible eliminar el tipo de cliente';
    const status = message.includes('no encontrado') ? 404 : message.includes('permiso') ? 403 : 500;
    return res.status(status).json({ success: false, data: null, error: message });
  }
}
```

### 2.7 `routes/tiposCliente.routes.ts` (NUEVO)

**Archivo:** `backend/src/routes/tiposCliente.routes.ts`

```typescript
import { Router } from 'express';
import { list, create, update, remove } from '../controllers/tiposCliente.controller.js';

const router = Router();

router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
```

---

## 🔧 FASE 3: Frontend - Domain y Services

### 3.1 `domain/lead.ts` (MODIFICAR)

**Archivo:** `frontend/src/domain/lead.ts`

```typescript
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
  
  createdAt: z.string(),
  updatedAt: z.string(),
});
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
export const LeadConvertResponseSchema = ApiEnvelopeSchema(z.object({
  id: z.string(),
  leadId: z.string().nullable().optional(),
  etapa: z.string().optional(),
}));
```

### 3.2 `services/actividades.api.ts` (NUEVO)

**Archivo:** `frontend/src/services/actividades.api.ts`

```typescript
import http from './http';
import type { ActividadLead, CreateActividadInput } from '../domain/lead';

export const actividadesApi = {
  list: (leadId: string) =>
    http.get<{ success: boolean; data: ActividadLead[] }>(`/leads/${leadId}/actividades`),

  create: (leadId: string, input: CreateActividadInput) =>
    http.post<{ success: boolean; data: ActividadLead }>(`/leads/${leadId}/actividades`, input),
};
```

### 3.3 `services/tiposCliente.api.ts` (NUEVO)

**Archivo:** `frontend/src/services/tiposCliente.api.ts`

```typescript
import http from './http';
import type { TipoCliente } from '../domain/lead';

export const tiposClienteApi = {
  list: () =>
    http.get<{ success: boolean; data: TipoCliente[] }>('/tipos-cliente'),

  create: (input: { nombre: string }) =>
    http.post<{ success: boolean; data: TipoCliente }>('/tipos-cliente', input),

  update: (id: string, input: { nombre?: string; activo?: boolean }) =>
    http.patch<{ success: boolean; data: TipoCliente }>(`/tipos-cliente/${id}`, input),

  remove: (id: string) =>
    http.delete<{ success: boolean; data: { id: string } }>(`/tipos-cliente/${id}`),
};
```

### 3.4 `services/index.ts` (MODIFICAR)

**Archivo:** `frontend/src/services/index.ts`

```typescript
// Agregar exports:
export { actividadesApi } from './actividades.api';
export { tiposClienteApi } from './tiposCliente.api';
```

### 3.5 `stores/leads.ts` (MODIFICAR)

**Archivo:** `frontend/src/stores/leads.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { leadsApi } from '../services';
import { actividadesApi } from '../services/actividades.api';
import type { Lead, LeadInput, LeadPatch, CreateActividadInput, AprobarLeadInput, RechazarLeadInput } from '../domain/lead';

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref<Lead[]>([]);
  const loading = ref(false);
  const error = ref('');

  const activeLeads = computed(() => leads.value.filter((l) => l.estadoCalificacion !== 'DESCARTADO'));

  async function hydrate() {
    // Hydrate from cache if available
  }

  async function load(force = false) {
    if (leads.value.length && !force) return;
    loading.value = true;
    error.value = '';
    try {
      const response = await leadsApi.list();
      leads.value = response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al cargar leads';
    } finally {
      loading.value = false;
    }
  }

  async function create(input: LeadInput) {
    loading.value = true;
    error.value = '';
    try {
      const response = await leadsApi.create(input);
      leads.value.unshift(response.data.data);
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al crear lead';
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  async function update(id: string, input: LeadPatch) {
    loading.value = true;
    error.value = '';
    try {
      const response = await leadsApi.update(id, input);
      const index = leads.value.findIndex((l) => l.id === id);
      if (index !== -1) leads.value[index] = response.data.data;
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al actualizar lead';
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  async function setCalificacion(lead: Lead, estado: Lead['estadoCalificacion']) {
    return update(lead.id, { estadoCalificacion: estado });
  }

  async function remove(id: string) {
    loading.value = true;
    error.value = '';
    try {
      await leadsApi.remove(id);
      leads.value = leads.value.filter((l) => l.id !== id);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al eliminar lead';
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  async function convert(id: string) {
    loading.value = true;
    error.value = '';
    try {
      const response = await leadsApi.convert(id);
      // Actualizar el lead en el store
      const index = leads.value.findIndex((l) => l.id === id);
      if (index !== -1) {
        leads.value[index] = { ...leads.value[index], estado: 'APROBADO' };
      }
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al convertir lead';
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  async function aprobar(leadId: string, input: AprobarLeadInput) {
    loading.value = true;
    error.value = '';
    try {
      const response = await leadsApi.aprobar(leadId, input);
      // Actualizar el lead en el store
      const index = leads.value.findIndex((l) => l.id === leadId);
      if (index !== -1) {
        leads.value[index] = { ...leads.value[index], estado: 'APROBADO' };
      }
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al aprobar lead';
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  async function rechazar(leadId: string, input: RechazarLeadInput) {
    loading.value = true;
    error.value = '';
    try {
      const response = await leadsApi.rechazar(leadId, input);
      // Recargar leads para obtener estado actualizado
      await load(true);
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al rechazar lead';
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  async function loadActividades(leadId: string) {
    try {
      const response = await actividadesApi.list(leadId);
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al cargar actividades';
      return [];
    }
  }

  async function addActividad(leadId: string, input: CreateActividadInput) {
    try {
      const response = await actividadesApi.create(leadId, input);
      return response.data.data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al crear actividad';
      throw cause;
    }
  }

  return {
    leads,
    loading,
    error,
    activeLeads,
    hydrate,
    load,
    create,
    update,
    setCalificacion,
    remove,
    convert,
    aprobar,
    rechazar,
    loadActividades,
    addActividad,
  };
});
```

### 3.6 `services/leads.api.ts` (MODIFICAR)

**Archivo:** `frontend/src/services/leads.api.ts`

```typescript
import http from './http';
import type { Lead, LeadInput, LeadPatch, AprobarLeadInput, RechazarLeadInput } from '../domain/lead';

export const leadsApi = {
  list: () =>
    http.get<{ success: boolean; data: Lead[] }>('/leads'),

  create: (input: LeadInput) =>
    http.post<{ success: boolean; data: Lead }>('/leads', input),

  update: (id: string, input: LeadPatch) =>
    http.patch<{ success: boolean; data: Lead }>(`/leads/${id}`, input),

  remove: (id: string) =>
    http.delete<{ success: boolean; data: { id: string } }>(`/leads/${id}`),

  convert: (id: string) =>
    http.post<{ success: boolean; data: { id: string; leadId?: string; etapa?: string } }>(`/leads/${id}/convert`),

  aprobar: (id: string, input: AprobarLeadInput) =>
    http.post<{ success: boolean; data: { id: string } }>(`/leads/${id}/aprobar`, input),

  rechazar: (id: string, input: RechazarLeadInput) =>
    http.post<{ success: boolean; data: { success: boolean; leadId: string; rubro: string } }>(`/leads/${id}/rechazar`, input),

  getRechazos: (id: string) =>
    http.get<{ success: boolean; data: Array<{ id: string; rubro: string; motivo: string; createdAt: string }> }>(`/leads/${id}/rechazos`),
};
```

---

## 🔧 FASE 4: Frontend - Componentes

### 4.1 `LeadCaptureModal.vue` (NUEVO)

**Archivo:** `frontend/src/components/common/LeadCaptureModal.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TipoRif } from '../../domain/lead';

const props = defineProps<{
  loading: boolean;
  error: string;
  cuentasComerciales?: Array<{ id: string; nombre: string; rif: string | null }>;
}>();

const emit = defineEmits<{
  (e: 'submit', data: any): void;
  (e: 'close'): void;
}>();

// Form data
const empresaNombre = ref('');
const tipoRif = ref<TipoRif>('V');
const numeroRif = ref('');
const digitoVerificador = ref('');
const direccion = ref('');
const telefonoEmpresa = ref('');
const tipoIndustria = ref('');
const cedulaContacto = ref('');
const nombreContacto = ref('');
const cargoContacto = ref('');
const telefonoContacto = ref('');
const emailContacto = ref('');
const fuente = ref<'WEB' | 'MENSAJE' | 'CORREO' | 'REUNION' | 'LLAMADA' | 'REFERIDO' | 'REDES'>('WEB');
const fechaCaptacion = ref(new Date().toISOString().slice(0, 10));
const descripcionCaptacion = ref('');
const cuentaComercialId = ref('');

const tiposRif: TipoRif[] = ['V', 'J', 'E', 'G', 'R', 'P'];
const fuentes = [
  { value: 'WEB', label: 'Web' },
  { value: 'MENSAJE', label: 'Mensaje (WhatsApp/SMS)' },
  { value: 'CORREO', label: 'Correo Electrónico' },
  { value: 'REUNION', label: 'Reunión' },
  { value: 'LLAMADA', label: 'Llamada Telefónica' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'REDES', label: 'Redes Sociales' },
];

const isValid = computed(() => {
  return (
    empresaNombre.value.length >= 2 &&
    nombreContacto.value.length >= 2 &&
    numeroRif.value.length >= 8 &&
    digitoVerificador.value.length === 1
  );
});

function handleSubmit() {
  if (!isValid.value) return;
  
  emit('submit', {
    empresaNombre: empresaNombre.value,
    tipoRif: tipoRif.value,
    numeroRif: numeroRif.value,
    digitoVerificador: digitoVerificador.value,
    direccion: direccion.value || undefined,
    telefonoEmpresa: telefonoEmpresa.value || undefined,
    tipoIndustria: tipoIndustria.value || undefined,
    cedulaContacto: cedulaContacto.value || undefined,
    nombreContacto: nombreContacto.value,
    cargoContacto: cargoContacto.value || undefined,
    telefonoContacto: telefonoContacto.value || undefined,
    emailContacto: emailContacto.value || undefined,
    fuente: fuente.value,
    fechaCaptacion: fechaCaptacion.value,
    descripcionCaptacion: descripcionCaptacion.value || undefined,
    cuentaComercialId: cuentaComercialId.value || undefined,
  });
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <h2 class="text-lg font-bold text-[#073b73]">Captar Nuevo Lead</h2>
        <button
          class="text-slate-400 hover:text-slate-600 transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-6">
        <!-- Sección 1: Datos de la Empresa -->
        <fieldset class="border border-slate-200 rounded-xl p-4">
          <legend class="text-sm font-bold text-[#073b73] px-2">Datos de la Empresa</legend>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- RIF -->
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">RIF *</label>
              <div class="flex gap-2">
                <select
                  v-model="tipoRif"
                  class="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                >
                  <option v-for="tipo in tiposRif" :key="tipo" :value="tipo">{{ tipo }}</option>
                </select>
                <input
                  v-model="numeroRif"
                  type="text"
                  placeholder="12345678"
                  maxlength="9"
                  pattern="[0-9]{8,9}"
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                  required
                />
                <span class="flex items-center text-slate-500">-</span>
                <input
                  v-model="digitoVerificador"
                  type="text"
                  placeholder="0"
                  maxlength="1"
                  pattern="[0-9]"
                  class="w-12 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:border-[#073b73]"
                  required
                />
              </div>
            </div>

            <!-- Razón Social -->
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Razón Social *</label>
              <input
                v-model="empresaNombre"
                type="text"
                placeholder="Nombre de la empresa"
                minlength="2"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              />
            </div>

            <!-- Tipo Industria -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de Industria</label>
              <input
                v-model="tipoIndustria"
                type="text"
                placeholder="Ej: Alimentos, Combustibles..."
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <!-- Teléfono Empresa -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
              <input
                v-model="telefonoEmpresa"
                type="tel"
                placeholder="0212-1234567"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <!-- Dirección -->
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
              <input
                v-model="direccion"
                type="text"
                placeholder="Dirección de la empresa"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>
          </div>
        </fieldset>

        <!-- Sección 2: Datos del Contacto -->
        <fieldset class="border border-slate-200 rounded-xl p-4">
          <legend class="text-sm font-bold text-[#073b73] px-2">Datos del Contacto</legend>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Cédula -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Cédula</label>
              <input
                v-model="cedulaContacto"
                type="text"
                placeholder="V-12345678"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <!-- Nombre Contacto -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nombre del Contacto *</label>
              <input
                v-model="nombreContacto"
                type="text"
                placeholder="Nombre completo"
                minlength="2"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              />
            </div>

            <!-- Cargo -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
              <input
                v-model="cargoContacto"
                type="text"
                placeholder="Ej: Gerente de Compras"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <!-- Teléfono Contacto -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
              <input
                v-model="telefonoContacto"
                type="tel"
                placeholder="0414-1234567"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <!-- Correo -->
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                v-model="emailContacto"
                type="email"
                placeholder="correo@empresa.com"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>
          </div>
        </fieldset>

        <!-- Sección 3: Actividad de Captación -->
        <fieldset class="border border-slate-200 rounded-xl p-4">
          <legend class="text-sm font-bold text-[#073b73] px-2">Actividad de Captación</legend>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Fuente -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Captado por *</label>
              <select
                v-model="fuente"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              >
                <option v-for="fuente in fuentes" :key="fuente.value" :value="fuente.value">
                  {{ fuente.label }}
                </option>
              </select>
            </div>

            <!-- Fecha -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Fecha de Captación *</label>
              <input
                v-model="fechaCaptacion"
                type="date"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              />
            </div>

            <!-- Descripción -->
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Descripción / Nota</label>
              <textarea
                v-model="descripcionCaptacion"
                rows="3"
                placeholder="Describe qué se conversó con el posible cliente..."
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              ></textarea>
            </div>
          </div>
        </fieldset>

        <!-- Cuenta Comercial (opcional) -->
        <div v-if="cuentasComerciales?.length">
          <label class="block text-xs font-bold text-slate-700 mb-1">Cuenta Comercial (opcional)</label>
          <select
            v-model="cuentaComercialId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
          >
            <option value="">Ninguna (se creará automáticamente)</option>
            <option
              v-for="cuenta in cuentasComerciales"
              :key="cuenta.id"
              :value="cuenta.id"
            >
              {{ cuenta.nombre }} ({{ cuenta.rif || 'Sin RIF' }})
            </option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!isValid || loading"
            class="px-6 py-2 bg-[#8bd329] text-[#073b73] font-bold rounded-lg text-sm shadow-md transition-all hover:bg-lime-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="animate-spin">⏳</span>
            <span>{{ loading ? 'Capturando...' : 'Captar Lead' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
```

### 4.2 `ApproveLeadModal.vue` (NUEVO)

**Archivo:** `frontend/src/components/common/ApproveLeadModal.vue`

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Lead, TipoCliente } from '../../domain/lead';
import { tiposClienteApi } from '../../services/tiposCliente.api';
import http from '../../services/http';

const props = defineProps<{
  lead: Lead;
  loading: boolean;
  error: string;
  userRole: string;
}>();

const emit = defineEmits<{
  (e: 'submit', data: any): void;
  (e: 'close'): void;
}>();

const rubro = ref('');
const estimadoCompra = ref(0);
const necesidadUnidades = ref(1);
const fechaEstimadaCierre = ref('');
const tipoClienteId = ref('');
const vendedorAsignadoId = ref('');

const tiposCliente = ref<TipoCliente[]>([]);
const vendedores = ref<Array<{ id: string; nombre: string }>>([]);

// Rubros disponibles (esto podría venir de una config)
const rubros = [
  { value: 'COMBUSTIBLE', label: 'Combustible' },
  { value: 'LUBRICANTES', label: 'Lubricantes' },
  { value: 'AUTOPARTES', label: 'Autopartes' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTOS_BALANCEADOS', label: 'Alimentos Balanceados' },
  { value: 'ALIMENTOS_CONGELADOS', label: 'Alimentos Congelados' },
];

const isValid = computed(() => {
  return (
    rubro.value &&
    estimadoCompra.value >= 0 &&
    necesidadUnidades.value >= 1 &&
    fechaEstimadaCierre.value &&
    tipoClienteId.value &&
    vendedorAsignadoId.value
  );
});

onMounted(async () => {
  // Cargar tipos de cliente
  try {
    const response = await tiposClienteApi.list();
    tiposCliente.value = response.data.data;
  } catch (error) {
    console.error('Error al cargar tipos de cliente:', error);
  }

  // Cargar vendedores de la empresa
  // (Esto debería tener un endpoint específico, por ahora usamos un mock)
  // En producción, crear un endpoint GET /usuarios?rol=VENDEDOR&empresaId=xxx
});

async function loadVendedores(empresaId: string) {
  // TODO: Implementar endpoint para obtener vendedores por empresa
  // Por ahora, usar datos de ejemplo
  vendedores.value = [
    { id: 'vendedor-1', nombre: 'Vendedor 1' },
    { id: 'vendedor-2', nombre: 'Vendedor 2' },
  ];
}

function handleSubmit() {
  if (!isValid.value) return;
  
  emit('submit', {
    rubro: rubro.value,
    estimadoCompra: estimadoCompra.value,
    necesidadUnidades: necesidadUnidades.value,
    fechaEstimadaCierre: fechaEstimadaCierre.value,
    tipoClienteId: tipoClienteId.value,
    vendedorAsignadoId: vendedorAsignadoId.value,
  });
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <h2 class="text-lg font-bold text-[#073b73]">Aprobar Lead</h2>
        <button
          class="text-slate-400 hover:text-slate-600 transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Lead Info -->
      <div class="px-5 pt-4 pb-2 bg-slate-50">
        <p class="text-sm text-slate-600">
          <strong class="text-slate-900">{{ lead.empresaNombre }}</strong>
          <span v-if="lead.rif" class="ml-2 font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">
            {{ lead.rif }}
          </span>
        </p>
        <p class="text-xs text-slate-500 mt-1">Contacto: {{ lead.nombreContacto }}</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
        <!-- Rubro -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Rubro a asignar *</label>
          <select
            v-model="rubro"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar rubro</option>
            <option v-for="r in rubros" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </div>

        <!-- Estimado -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Estimado de compra ($) *</label>
          <input
            v-model.number="estimadoCompra"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          />
        </div>

        <!-- Necesidad -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Necesidad (unidades) *</label>
          <input
            v-model.number="necesidadUnidades"
            type="number"
            min="1"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          />
        </div>

        <!-- Fecha cierre -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Fecha estimada de cierre *</label>
          <input
            v-model="fechaEstimadaCierre"
            type="date"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          />
        </div>

        <!-- Tipo Cliente -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de cliente *</label>
          <select
            v-model="tipoClienteId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar tipo</option>
            <option v-for="tipo in tiposCliente" :key="tipo.id" :value="tipo.id">
              {{ tipo.nombre }}
            </option>
          </select>
        </div>

        <!-- Vendedor -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Asignar vendedor *</label>
          <select
            v-model="vendedorAsignadoId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar vendedor</option>
            <option v-for="v in vendedores" :key="v.id" :value="v.id">
              {{ v.nombre }}
            </option>
          </select>
        </div>

        <!-- CrossSelling Info -->
        <div v-if="lead.crossSelling" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-xs text-amber-800">
            <strong>⚠️ Este cliente ya compra en:</strong>
            <span v-if="lead.crossSelling.combustible === 'COMPRA'"> Combustible</span>
            <span v-if="lead.crossSelling.lubricantes === 'COMPRA'"> Lubricantes</span>
            <span v-if="lead.crossSelling.autopartes === 'COMPRA'"> Autopartes</span>
            <span v-if="lead.crossSelling.transporte === 'COMPRA'"> Transporte</span>
            <span v-if="lead.crossSelling.alimentosBalanceados === 'COMPRA'"> Alimentos Balanceados</span>
            <span v-if="lead.crossSelling.alimentosCongelados === 'COMPRA'"> Alimentos Congelados</span>
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!isValid || loading"
            class="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm shadow-md transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="animate-spin">⏳</span>
            <span>{{ loading ? 'Aprobando...' : 'Aprobar Lead' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
```

### 4.3 `RejectLeadModal.vue` (NUEVO)

**Archivo:** `frontend/src/components/common/RejectLeadModal.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Lead } from '../../domain/lead';

const props = defineProps<{
  lead: Lead;
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'submit', data: { rubro: string; motivo: string }): void;
  (e: 'close'): void;
}>();

const rubro = ref('');
const motivo = ref('');

const rubros = [
  { value: 'COMBUSTIBLE', label: 'Combustible' },
  { value: 'LUBRICANTES', label: 'Lubricantes' },
  { value: 'AUTOPARTES', label: 'Autopartes' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTOS_BALANCEADOS', label: 'Alimentos Balanceados' },
  { value: 'ALIMENTOS_CONGELADOS', label: 'Alimentos Congelados' },
];

const isValid = computed(() => {
  return rubro.value && motivo.value.length >= 10;
});

function handleSubmit() {
  if (!isValid.value) return;
  
  emit('submit', {
    rubro: rubro.value,
    motivo: motivo.value,
  });
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <h2 class="text-lg font-bold text-red-600">Rechazar Lead</h2>
        <button
          class="text-slate-400 hover:text-slate-600 transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Lead Info -->
      <div class="px-5 pt-4 pb-2 bg-slate-50">
        <p class="text-sm text-slate-600">
          <strong class="text-slate-900">{{ lead.empresaNombre }}</strong>
          <span v-if="lead.rif" class="ml-2 font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">
            {{ lead.rif }}
          </span>
        </p>
        <p class="text-xs text-slate-500 mt-1">Contacto: {{ lead.nombreContacto }}</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
        <!-- Rubro -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Rubro a rechazar *</label>
          <select
            v-model="rubro"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar rubro</option>
            <option v-for="r in rubros" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </div>

        <!-- Motivo -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Motivo del rechazo *</label>
          <textarea
            v-model="motivo"
            rows="4"
            placeholder="Describe el motivo del rechazo (mínimo 10 caracteres)..."
            minlength="10"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          ></textarea>
        </div>

        <!-- Info -->
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-xs text-blue-800">
            ℹ️ El lead seguirá disponible para otros rubros que no hayan sido rechazados.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!isValid || loading"
            class="px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-sm shadow-md transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="animate-spin">⏳</span>
            <span>{{ loading ? 'Rechazando...' : 'Rechazar Lead' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
```

### 4.4 `SellerHeader.vue` (MODIFICAR)

**Archivo:** `frontend/src/components/seller/SellerHeader.vue`

```vue
<script setup lang="ts">
defineProps<{
  companyName: string;
  sellerName?: string;
}>();

defineEmits<{
  (e: 'open-lead-modal'): void;
  (e: 'logout'): void;
}>();
</script>

<template>
  <header class="bg-brand-blue text-white px-6 py-4 flex items-center justify-between shadow-md">
    <div class="flex items-center gap-3">
      <span class="w-3 h-3 bg-brand-green rounded-full inline-block"></span>
      <strong class="text-lg font-bold tracking-tight">{{ companyName }}</strong>
      <span class="bg-brand-blue-light/50 text-sky-200 text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Portal Vendedor</span>
    </div>
    <div class="flex items-center gap-4">
      <span v-if="sellerName" class="text-sm text-sky-100 hidden sm:inline">Vendedor: <b class="text-white">{{ sellerName }}</b></span>
      <button class="bg-brand-green text-brand-ink font-bold px-4 py-2 rounded-lg text-sm transition hover:bg-lime-400 shadow" @click="$emit('open-lead-modal')">+ Captar Lead</button>
      <button class="bg-red-600/20 text-red-200 hover:bg-red-600/40 px-3 py-2 rounded-lg text-sm transition" @click="$emit('logout')">Cerrar sesión</button>
    </div>
  </header>
</template>
```

### 4.5 `SellerDashboard.vue` (MODIFICAR)

**Archivo:** `frontend/src/views/SellerDashboard.vue`

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useDashboardStore } from '../stores/dashboard';
import { useLeadsStore } from '../stores/leads';
import { useVisitasStore } from '../stores/visitas';
import { cuentasComercialesApi } from '../services';
import type { CuentaComercial } from '../domain';

import SellerHeader from '../components/seller/SellerHeader.vue';
import SellerOverviewMetrics from '../components/seller/SellerOverviewMetrics.vue';
import WeeklyRoutePlanner from '../components/seller/WeeklyRoutePlanner.vue';
import SalesHistogramChart from '../components/seller/SalesHistogramChart.vue';
import ClientPortfolioList from '../components/seller/ClientPortfolioList.vue';
import LeadCaptureModal from '../components/common/LeadCaptureModal.vue';

const auth = useAuthStore();
const dashboard = useDashboardStore();
const leads = useLeadsStore();
const visitas = useVisitasStore();
const loading = ref(true);
const error = ref('');
type Client = { id: string; razonSocial: string; rif: string; estado: string; vendedor: string; visitas: Array<{ semana: number; dia: string; estado: string; latitud?: number | null; longitud?: number | null }>; ventas: Array<{ mes: string; semana: number; unidades: number; monto: number }> };
const clients = computed<Client[]>(() => dashboard.clients as unknown as Client[]);
const companyName = computed(() => auth.empresa?.nombre ?? 'Empresa');
const search = ref('');
const onlyWithSales = ref(false);
const selectedDay = ref('Lunes');
const selectedWeek = ref(1);
const selectedMonth = ref('');
const checkingIn = ref<string | null>(null);
const checkInError = ref('');
const showLeadModal = ref(false);
const leadFormError = ref('');
const cuentasComerciales = ref<CuentaComercial[]>([]);

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const weeks = computed(() => [...new Set(clients.value.flatMap((client) => client.visitas.map((visit) => visit.semana)))].sort((a, b) => a - b));
const months = computed<string[]>(() => buildLastNineMonths());

const sales = computed<number[]>(() => months.value.map((month) => clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === month).reduce((total, sale) => total + sale.monto, 0)));
const units = computed<number[]>(() => months.value.map((month) => clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === month).reduce((total, sale) => total + sale.unidades, 0)));
const routeClients = computed(() => clients.value.filter((client) => client.visitas.some((visit) => visit.semana === selectedWeek.value && visit.dia === selectedDay.value)));

const selectedClient = ref<Client | null>(null);

function buildLastNineMonths(now: Date = new Date()): string[] {
  const result: string[] = [];
  for (let offset = 8; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
  }
  return result;
}

const clientMonths = computed<string[]>(() => {
  if (!selectedClient.value) return months.value;
  return buildLastNineMonths();
});

const clientSales = computed<number[]>(() => {
  const source = selectedClient.value;
  if (!source) return sales.value;
  const targetMonths = clientMonths.value;
  return targetMonths.map((month) =>
    source.ventas
      .filter((sale) => sale.mes === month)
      .reduce((total, sale) => total + sale.monto, 0),
  );
});

const clientUnits = computed<number[]>(() => {
  const source = selectedClient.value;
  if (!source) return units.value;
  return clientMonths.value.map((month) =>
    source.ventas
      .filter((sale) => sale.mes === month)
      .reduce((total, sale) => total + sale.unidades, 0),
  );
});

const selectedMonthSales = computed(() => {
  const source = selectedClient.value;
  if (!source) {
    return clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === selectedMonth.value);
  }
  return source.ventas.filter((sale) => sale.mes === selectedMonth.value);
});
const selectedMonthTotal = computed(() => selectedMonthSales.value.reduce((total, sale) => total + sale.monto, 0));
const selectedMonthUnits = computed(() => selectedMonthSales.value.reduce((total, sale) => total + sale.unidades, 0));
const weeklyBreakdown = computed(() => [1, 2, 3, 4].map((week) => selectedMonthSales.value.filter((sale) => sale.semana === week).reduce((total, sale) => total + sale.monto, 0)));

function hasSales(client: Client): boolean {
  return client.ventas.some((sale) => sale.monto > 0);
}

const filteredClients = computed(() => {
  const query = search.value.trim().toLowerCase();
  let result = clients.value;

  if (query) {
    const normalize = (value: string) =>
      value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedQuery = normalize(query).replace(/[^a-z0-9]/g, '');

    result = result.filter((client) => {
      const razonSocial = normalize(client.razonSocial ?? '');
      const rifNormalized = normalize(client.rif ?? '').replace(/[^a-z0-9]/g, '');
      const estado = normalize(client.estado ?? '');
      const vendedor = normalize((client as Client).vendedor ?? '');

      return (
        razonSocial.includes(query) ||
        estado.includes(query) ||
        vendedor.includes(query) ||
        rifNormalized.includes(normalizedQuery)
      );
    });
  }

  if (onlyWithSales.value) {
    result = result.filter(hasSales);
  }

  return result;
});

async function checkIn(client: Client) {
  checkingIn.value = client.id;
  checkInError.value = '';
  try {
    await visitas.registrarCheckIn({
      rif: client.rif,
      clienteRazonSocial: client.razonSocial,
      semana: selectedWeek.value,
      dia: selectedDay.value,
      comentario: 'Check-in registrado desde portal vendedor',
    });
    const clientRecord = clients.value.find((c) => c.id === client.id);
    const visitRecord = clientRecord?.visitas.find((v) => v.semana === selectedWeek.value && v.dia === selectedDay.value);
    if (visitRecord) { visitRecord.estado = 'VISITADO'; }
  } catch (cause) {
    checkInError.value = cause instanceof Error ? cause.message : 'No fue posible completar el check-in';
  } finally {
    checkingIn.value = null;
  }
}

async function submitLead(leadData: any) {
  leadFormError.value = '';
  try {
    await leads.create(leadData);
    showLeadModal.value = false;
  } catch (cause) {
    leadFormError.value = cause instanceof Error ? cause.message : 'No fue posible crear el lead';
  }
}

function selectClient(client: Client): void {
  selectedClient.value = client;
  const targetMonths = buildLastNineMonths();
  const lastAvailable = [...targetMonths].reverse().find((m) => client.ventas.some((s) => s.mes === m));
  selectedMonth.value = lastAvailable ?? targetMonths[targetMonths.length - 1];

  nextTick(() => {
    const chart = document.getElementById('sales-histogram-section');
    chart?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function clearClientSelection(): void {
  selectedClient.value = null;
  if (months.value.length) {
    selectedMonth.value = months.value[months.value.length - 1];
  }
}

onMounted(async () => {
  try {
    const [accounts] = await Promise.all([cuentasComercialesApi.list(), dashboard.load(true)]);
    cuentasComerciales.value = accounts;
    if (months.value.length) { selectedMonth.value = months.value[months.value.length - 1]; }
    if (weeks.value.length) { selectedWeek.value = weeks.value[0]; }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Error al cargar el dashboard';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-brand-sky pb-12">
    <SellerHeader 
      :company-name="companyName" 
      :seller-name="auth.user?.nombre" 
      @open-lead-modal="showLeadModal = true" 
      @logout="auth.logout" 
    />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div v-if="loading" class="text-center py-12 text-slate-500">Cargando espacio comercial...</div>
      <div v-else-if="error" class="bg-red-50 text-red-700 p-4 rounded-xl text-center border border-red-200">{{ error }}</div>
      <template v-else>
        <SellerOverviewMetrics :metrics="dashboard.metrics" />

        <ClientPortfolioList
          :filtered-clients="filteredClients"
          v-model:search="search"
          v-model:only-with-sales="onlyWithSales"
          @select-client="selectClient"
        />

        <SalesHistogramChart
          id="sales-histogram-section"
          :months="clientMonths"
          :sales="clientSales"
          :units="clientUnits"
          v-model:selected-month="selectedMonth"
          :selected-month-total="selectedMonthTotal"
          :selected-month-units="selectedMonthUnits"
          :weekly-breakdown="weeklyBreakdown"
          :selected-month-sales="selectedMonthSales"
          :chart-title="selectedClient ? `Histograma de Ventas — ${selectedClient.razonSocial}` : 'Histograma de Ventas (Últimos 9 Meses)'"
          :chart-subtitle="selectedClient
            ? `Ventas mensuales de ${selectedClient.razonSocial} (${selectedClient.rif}) en los últimos 9 meses. Toca cualquier mes para ver el desglose semanal.`
            : 'Toca o haz clic en cualquier mes para desglosar el detalle de las 4 semanas.'"
          :clear-label="selectedClient ? 'Volver a vista global' : ''"
          @clear-selection="clearClientSelection"
        />

        <WeeklyRoutePlanner 
          :weeks="weeks" 
          :days="days" 
          v-model:selected-week="selectedWeek" 
          v-model:selected-day="selectedDay" 
          :route-clients="routeClients" 
          :checking-in="checkingIn" 
          :check-in-error="checkInError" 
          @check-in="checkIn" 
        />

      </template>
    </main>

    <LeadCaptureModal 
      v-if="showLeadModal" 
      :loading="leads.loading" 
      :error="leadFormError"
      :cuentas-comerciales="cuentasComerciales"
      @submit="submitLead" 
      @close="showLeadModal = false" 
    />
  </div>
</template>
```

---

## 🔧 FASE 5: AdminDashboard - Modales y Bandeja

### 5.1 Cambios en la vista de Leads (AdminDashboard.vue)

**Archivo:** `frontend/src/views/AdminDashboard.vue`

**Sección de Leads (línea ~857):**

```vue
<!-- Agregar import de modales -->
<script setup>
// ... imports existentes ...
import ApproveLeadModal from '../components/common/ApproveLeadModal.vue';
import RejectLeadModal from '../components/common/RejectLeadModal.vue';
</script>

<!-- Estado para modales -->
const showApproveModal = ref(false);
const showRejectModal = ref(false);
const selectedLeadForAction = ref<Lead | null>(null);
const leadActionError = ref('');

// Funciones de aprobación/rechazo
async function handleApproveLead(input: AprobarLeadInput) {
  if (!selectedLeadForAction.value) return;
  leadActionError.value = '';
  try {
    await leads.aprobar(selectedLeadForAction.value.id, input);
    showApproveModal.value = false;
    selectedLeadForAction.value = null;
  } catch (cause) {
    leadActionError.value = cause instanceof Error ? cause.message : 'Error al aprobar lead';
  }
}

async function handleRejectLead(input: RechazarLeadInput) {
  if (!selectedLeadForAction.value) return;
  leadActionError.value = '';
  try {
    await leads.rechazar(selectedLeadForAction.value.id, input);
    showRejectModal.value = false;
    selectedLeadForAction.value = null;
  } catch (cause) {
    leadActionError.value = cause instanceof Error ? cause.message : 'Error al rechazar lead';
  }
}

function openApproveModal(lead: Lead) {
  selectedLeadForAction.value = lead;
  showApproveModal.value = true;
}

function openRejectModal(lead: Lead) {
  selectedLeadForAction.value = lead;
  showRejectModal.value = true;
}
```

**Template de cada lead:**

```vue
<!-- Agregar badges de estado -->
<div class="flex items-center gap-2 flex-wrap">
  <strong class="text-sm font-bold text-slate-900">{{ lead.empresaNombre }}</strong>
  <span class="text-xs text-slate-600 font-medium">({{ lead.nombreContacto }})</span>
  
  <!-- Badge de estado -->
  <span
    :class="[
      'text-[10px] font-bold px-2 py-0.5 rounded-full',
      lead.estado === 'ACTIVO' ? 'bg-blue-100 text-blue-700' :
      lead.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' :
      lead.estado === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
      'bg-amber-100 text-amber-700'
    ]"
  >
    {{ lead.estado }}
  </span>
  
  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#073b73]">
    {{ lead.fuente }}
  </span>
  
  <span v-if="lead.rif" class="font-mono text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
    {{ lead.rif }}
  </span>
</div>

<!-- Agregar información de contacto -->
<div class="text-xs text-slate-500 flex items-center gap-3">
  <span>✉ {{ lead.emailContacto || lead.email || 'Sin email' }}</span>
  <span>📞 {{ lead.telefonoContacto || lead.telefono || 'Sin teléfono' }}</span>
  <span v-if="lead.cargoContacto">👤 {{ lead.cargoContacto }}</span>
</div>

<!-- Agregar actividad inicial si existe -->
<div v-if="lead.descripcionCaptacion" class="text-xs text-slate-600 pt-1">
  <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
    <strong>Captación:</strong> {{ lead.descripcionCaptacion }}
  </span>
</div>

<!-- Agregar indicador CrossSelling -->
<div v-if="lead.crossSelling" class="text-xs text-amber-600 pt-1">
  <span class="bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
    ⚠️ Ya compra en:
    <span v-if="lead.crossSelling.combustible === 'COMPRA'">Combustible </span>
    <span v-if="lead.crossSelling.lubricantes === 'COMPRA'">Lubricantes </span>
    <span v-if="lead.crossSelling.autopartes === 'COMPRA'">Autopartes </span>
  </span>
</div>

<!-- Acciones: Aprobar/Rechazar -->
<div class="flex items-center gap-2 self-end md:self-auto">
  <!-- Calificación actual -->
  <select
    :value="lead.estadoCalificacion"
    class="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold outline-none text-slate-700"
    @change="leads.setCalificacion(lead, ($event.target as HTMLSelectElement).value as any)"
  >
    <option value="NUEVO">Nuevo</option>
    <option value="CALIFICADO">Calificado</option>
    <option value="DESCARTADO">Descartado</option>
  </select>

  <!-- Botón Aprobar (solo si estado es ACTIVO) -->
  <button
    v-if="lead.estado === 'ACTIVO'"
    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
    @click="openApproveModal(lead)"
  >
    <span>✓ Aprobar</span>
  </button>

  <!-- Botón Rechazar (solo si estado es ACTIVO) -->
  <button
    v-if="lead.estado === 'ACTIVO'"
    class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
    @click="openRejectModal(lead)"
  >
    <span>✕ Rechazar</span>
  </button>

  <!-- Botón Promover (legacy, mantener si es necesario) -->
  <button
    v-if="lead.estadoCalificacion === 'CALIFICADO' && lead.estado === 'ACTIVO'"
    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
    @click="promoteLead(lead.id)"
  >
    <span>Promover a Kanban ➔</span>
  </button>

  <button
    class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded text-xs transition-colors"
    title="Eliminar lead"
    @click="leads.remove(lead.id)"
  >
    ✕
  </button>
</div>
```

**Timeline de Actividades (expandible):**

```vue
<!-- Agregar sección expandible de actividades -->
<div class="mt-3 pt-3 border-t border-slate-100">
  <button
    class="text-xs text-[#073b73] font-medium hover:underline flex items-center gap-1"
    @click="toggleActividades(lead.id)"
  >
    <span>{{ actividadesExpandidas.includes(lead.id) ? '▼' : '▶' }}</span>
    <span>Actividades ({{ lead.actividades?.length || 0 }})</span>
  </button>
  
  <div v-if="actividadesExpandidas.includes(lead.id)" class="mt-2 space-y-2">
    <div
      v-for="actividad in lead.actividades"
      :key="actividad.id"
      class="bg-slate-50 p-2 rounded border border-slate-200 text-xs"
    >
      <div class="flex items-center gap-2 text-slate-500">
        <span class="font-mono">{{ formatDate(actividad.fecha) }}</span>
        <span class="font-bold text-[#073b73]">{{ actividad.tipo }}</span>
        <span>— {{ actividad.autor.nombre }}</span>
      </div>
      <p class="text-slate-700 mt-1">{{ actividad.descripcion }}</p>
    </div>
    
    <button
      class="text-xs text-[#073b73] font-medium hover:underline"
      @click="openAddActividadModal(lead)"
    >
      + Agregar Actividad
    </button>
  </div>
</div>
```

**Modales al final del template:**

```vue
<!-- Modal Aprobar Lead -->
<ApproveLeadModal
  v-if="showApproveModal && selectedLeadForAction"
  :lead="selectedLeadForAction"
  :loading="leads.loading"
  :error="leadActionError"
  :user-role="auth.user?.rol || ''"
  @submit="handleApproveLead"
  @close="showApproveModal = false; selectedLeadForAction = null"
/>

<!-- Modal Rechazar Lead -->
<RejectLeadModal
  v-if="showRejectModal && selectedLeadForAction"
  :lead="selectedLeadForAction"
  :loading="leads.loading"
  :error="leadActionError"
  @submit="handleRejectLead"
  @close="showRejectModal = false; selectedLeadForAction = null"
/>
```

---

## 🔧 FASE 6: Integración CrossSelling

### 6.1 Backend - Enriquecer Leads con CrossSelling

**Archivo:** `backend/src/services/leads.service.ts`

```typescript
// Agregar función para enriquecer leads con información de CrossSelling
async function enrichLeadWithCrossSelling(lead: any) {
  if (!lead.rif) return { ...lead, crossSelling: null };
  
  const clienteCorporativo = await prisma.clienteCorporativo.findUnique({
    where: { rif: lead.rif },
    include: { crossSellingMatriz: true }
  });
  
  return {
    ...lead,
    crossSelling: clienteCorporativo?.crossSellingMatriz || null
  };
}

// Modificar listLeads para incluir CrossSelling
export async function listLeads(context: RequestContext) {
  const leads = await prisma.lead.findMany({
    where: {
      empresaId: context.tenantId,
      ...(context.rol === 'VENDEDOR' ? { vendedorId: context.userId } : {})
    },
    include,
    orderBy: { createdAt: 'desc' }
  });
  
  // Enriquecer con CrossSelling
  return Promise.all(leads.map(enrichLeadWithCrossSelling));
}
```

### 6.2 Frontend - Actualizar LeadSchema

**Archivo:** `frontend/src/domain/lead.ts`

```typescript
// Agregar al LeadSchema:
export const LeadSchema = z.object({
  // ... campos existentes ...
  crossSelling: z.object({
    combustible: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    lubricantes: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    autopartes: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    transporte: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    alimentosBalanceados: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
    alimentosCongelados: z.enum(['COMPRA', 'NO_COMPRA', 'NA']),
  }).nullable().optional(),
}).passthrough();
```

---

## 🔧 FASE 7: CRUD Tipos de Cliente

### 7.1 Nueva sección en AdminDashboard

**Archivo:** `frontend/src/views/AdminDashboard.vue`

```vue
<!-- Agregar tab de Tipos de Cliente -->
const activeView = ref('kanban'); // Estado existente
// Las opciones de tabs incluirían: kanban, table, leads, tipos-cliente, etc.

<!-- Vista de Tipos de Cliente -->
<section v-else-if="activeView === 'tipos-cliente'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
    <div>
      <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
        <span>🏷️ Tipos de Cliente</span>
      </h2>
      <p class="text-xs text-slate-500 mt-0.5">Gestiona los tipos de cliente para esta empresa (Productor, Estándar, etc.).</p>
    </div>
    <button
      class="bg-[#8bd329] text-[#073b73] font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all hover:bg-lime-300 active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
      @click="openCreateTipoClienteModal"
    >
      <span>+</span>
      <span>Nuevo Tipo</span>
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
    <div
      v-for="tipo in tiposCliente"
      :key="tipo.id"
      class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between"
    >
      <div>
        <p class="text-sm font-bold text-slate-900">{{ tipo.nombre }}</p>
        <p class="text-xs text-slate-500">Estado: {{ tipo.activo ? 'Activo' : 'Inactivo' }}</p>
      </div>
      <div class="flex gap-2">
        <button
          class="text-slate-400 hover:text-[#073b73] p-1 rounded transition-colors"
          title="Editar"
          @click="openEditTipoClienteModal(tipo)"
        >
          ✏️
        </button>
        <button
          class="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
          title="Desactivar"
          @click="deleteTipoCliente(tipo.id)"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>

  <div v-if="!tiposCliente.length" class="text-center py-12 text-slate-500 text-xs">
    No hay tipos de cliente configurados. Crea uno para comenzar.
  </div>
</section>
```

---

## 📅 Cronograma de Implementación

### Semana 1: Backend Base
| Día | Tarea | Estado |
|-----|-------|--------|
| L | Modificar schema.prisma | ⬜ |
| L | Ejecutar migración | ⬜ |
| M | Crear actividades.service.ts | ⬜ |
| M | Crear actividades.controller.ts | ⬜ |
| X | Crear tiposCliente.service.ts | ⬜ |
| X | Crear tiposCliente.controller.ts | ⬜ |
| J | Modificar leads.service.ts | ⬜ |
| J | Modificar leads.controller.ts | ⬜ |
| V | Modificar leads.routes.ts | ⬜ |
| V | Tests de backend | ⬜ |

### Semana 2: Frontend Base
| Día | Tarea | Estado |
|-----|-------|--------|
| L | Modificar domain/lead.ts | ⬜ |
| L | Crear actividades.api.ts | ⬜ |
| M | Crear tiposCliente.api.ts | ⬜ |
| M | Modificar stores/leads.ts | ⬜ |
| X | Crear LeadCaptureModal.vue | ⬜ |
| X | Crear ApproveLeadModal.vue | ⬜ |
| J | Crear RejectLeadModal.vue | ⬜ |
| J | Modificar SellerHeader.vue | ⬜ |
| V | Modificar SellerDashboard.vue | ⬜ |

### Semana 3: Frontend Admin
| Día | Tarea | Estado |
|-----|-------|--------|
| L | Modificar AdminDashboard.vue (bandeja leads) | ⬜ |
| L | Agregar modales aprobación/rechazo | ⬜ |
| M | Agregar timeline de actividades | ⬜ |
| M | Agregar indicador CrossSelling | ⬜ |
| X | Agregar vista Tipos de Cliente | ⬜ |
| X | Eliminar ProspectModal.vue | ⬜ |
| J | Integración CrossSelling backend | ⬜ |
| J | Pruebas de flujo completo | ⬜ |
| V | Corrección de bugs | ⬜ |
| V | Deploy a staging | ⬜ |

### Semana 4: Pruebas y Deploy
| Día | Tarea | Estado |
|-----|-------|--------|
| L | Pruebas de aprobación/rechazo | ⬜ |
| L | Pruebas de rechazo por rubro | ⬜ |
| M | Pruebas de CrossSelling | ⬜ |
| M | Pruebas de tipos de cliente | ⬜ |
| X | QA completo | ⬜ |
| X | Documentación | ⬜ |
| J | Deploy a producción | ⬜ |

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Migración rompe datos existentes | Alto | Usar campos opcionales, backward compatible |
| CrossSelling no tiene datos | Medio | Manejar null, mostrar "No disponible" |
| Performance al consultar CrossSelling | Bajo | Agregar índices, cachear en frontend |
| AdminDashboard muy grande (1560 líneas) | Medio | Separar en componentes modulares |
| Validación RIF en frontend vs backend | Bajo | Mantener regex en ambos lados |
| Fuentes de captación nuevas rompen compatibilidad | Bajo | Mantener fuentes antiguas como opciones |

---

## 🧪 Casos de Prueba

### 1. Crear Lead (Vendedor)
- [ ] Vendedor hace login
- [ ] Click en "+ Captar Lead"
- [ ] Llena datos empresa (RIF separado: V-12345678-9)
- [ ] Llena datos contacto
- [ ] Llena actividad de captación (WEB, fecha hoy, descripción)
- [ ] Click en "Captar Lead"
- [ ] Lead aparece en bandeja Admin con estado ACTIVO
- [ ] Lead aparece como "Vendedor: [nombre]" en Admin
- [ ] Vendedor solo ve este lead en su dashboard

### 2. Aprobar Lead (Admin)
- [ ] Admin ve lead ACTIVO
- [ ] Click en "✓ Aprobar"
- [ ] Selecciona rubro (ej: COMBUSTIBLE)
- [ ] Ingresa estimado ($10,000)
- [ ] Ingresa unidades (100)
- [ ] Selecciona fecha cierre (30 días)
- [ ] Selecciona tipo de cliente (Productor)
- [ ] Selecciona vendedor (filtrado por empresa)
- [ ] Click en "Aprobar Lead"
- [ ] Se crea Oportunidad en Kanban
- [ ] Lead cambia estado a APROBADO
- [ ] CrossSellingMatriz se actualiza: combustible = COMPRA

### 3. Rechazar Lead (Admin)
- [ ] Admin ve lead ACTIVO
- [ ] Click en "✕ Rechazar"
- [ ] Selecciona rubro (ej: LUBRICANTES)
- [ ] Ingresa motivo (mínimo 10 caracteres)
- [ ] Click en "Rechazar Lead"
- [ ] Lead se marca como RECHAZADO para LUBRICANTES
- [ ] Lead sigue ACTIVO para otros rubros
- [ ] Se puede aprobar para COMBUSTIBLE

### 4. CrossSelling
- [ ] Lead aprobado para Combustible
- [ ] En CrossSellingMatriz se marca Combustible = COMPRA
- [ ] Al crear nuevo lead para mismo RIF, se muestra indicador
- [ ] Admin ve "⚠️ Ya compra en: Combustible"
- [ ] Se puede aprobar para otro rubro

### 5. Tipos de Cliente
- [ ] Admin crea tipo "Productor"
- [ ] Admin crea tipo "Estándar"
- [ ] Admin crea tipo "Mayorista"
- [ ] Al aprobar lead, select muestra esos tipos
- [ ] Admin puede editar nombre de tipo
- [ ] Admin puede desactivar tipo (soft delete)

### 6. Visibilidad por Roles
- [ ] Vendedor A crea lead → solo Vendedor A lo ve
- [ ] Vendedor B no ve el lead de Vendedor A
- [ ] Admin ve todos los leads
- [ ] Master ve todos los leads de todas las empresas

---

## 📝 Notas Técnicas

### Concatenación RIF
```typescript
// Frontend → Backend:
{
  tipoRif: 'J',
  numeroRif: '12345678',
  digitoVerificador: '9'
}

// Backend (leads.service.ts):
const rif = `${input.tipoRif}-${input.numeroRif}-${input.digitoVerificador}`;
// Guarda: "J-12345678-9"
```

### Fuentes de Captación (Actualizadas)
```typescript
enum FuenteLead {
  WEB       // Formulario web
  MENSAJE   // WhatsApp, SMS, etc.
  CORREO    // Email
  REUNION   // Reunión presencial/virtual
  LLAMADA   // Llamada telefónica
  REFERIDO  // Referido por cliente existente
  REDES     // Redes sociales
}
```

### Estados del Lead
```typescript
enum EstadoLead {
  ACTIVO      // Recién creado, pendiente revisión
  APROBADO    // Se creó oportunidad
  RECHAZADO   // Rechazado para TODOS los rubros
  EN_PROCESO  // En negociación activa
}
```

### Rubros Disponibles
```typescript
const RUBROS = [
  'COMBUSTIBLE',
  'LUBRICANTES',
  'AUTOPARTES',
  'TRANSPORTE',
  'ALIMENTOS_BALANCEADOS',
  'ALIMENTOS_CONGELADOS'
];
```

---

**Fin del Plan v1.0**

*Fecha: 07/09/2026*
*Estado: Pendiente de implementación*
