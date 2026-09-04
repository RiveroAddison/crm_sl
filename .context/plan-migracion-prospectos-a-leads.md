# Plan: Migrar de "Prospecto/Oportunidad" → "Lead abierto" + Registro de Actividad

**Estado:** Pendiente de aprobación e implementación
**Fecha de creación:** 04/09/2026
**Prioridad:** Alta — flujo comercial del vendedor

---

## 🎯 Objetivo

Reemplazar la creación directa de **prospectos/oportunidades** desde la vista del vendedor por un flujo donde **siempre se crea primero un Lead** (abierto a todos los rubros del grupo), con tres bloques de información obligatorios:

1. **Datos de la empresa captada** (razón social, RIF, contacto, dirección, etc.).
2. **Contacto con el que se negocia** (nombre, autoridad/cargo).
3. **Registro de actividad** (tipo + descripción de la primera interacción).

---

## 🔍 Estado actual (auditado)

### Lo que YA existe ✅

**Backend:**
- `model Lead` completo (BANT/MEDDIC): `nombreContacto`, `empresaNombre`, `rif`, `email`, `telefono`, `fuente`, `estadoCalificacion`, `presupuesto`, `necesidad`, `autoridad`, `tiempo`, `vendedorId`, `cuentaComercialId`.
- `LeadController` + `LeadService` + `routes/leads.routes.ts`.
- `POST /api/leads` (crear), `GET /api/leads`, `PATCH /api/leads/:id`, `DELETE /api/leads/:id`, `POST /api/leads/:id/convert` (convierte Lead calificado → Oportunidad).
- Multi-tenant: filtra por `empresaId` del contexto. Vendedor solo ve sus leads.

**Frontend:**
- `useLeadsStore`, `leadsApi`, `domain/lead.ts` con Zod schemas completos.
- `AdminDashboard.vue` ya tiene un modal de "Captar Nuevo Lead" (línea 1480+).
- Bandeja de Leads en Admin con cambio de calificación BANT/MEDDIC y promoción a oportunidad.

**Datos faltantes en `Lead`**: campo `direccion` (no existe en el modelo actual).

### Lo que está MAL / debe migrar ❌

- **`SellerDashboard.vue` línea 173-185**: el vendedor crea **oportunidades directamente** usando `ProspectModal.vue` + `useProspectsStore.create()`.
- **`ProspectModal.vue`**: pide razón social, RIF, dirección, teléfono, valor estimado, fecha de contacto, vendedor → es un modal de **oportunidad**, no de lead.
- **No existe** el modelo `Actividad` (registro de actividad/bitácora del lead).
- **No existe** un endpoint para crear/listar actividades de un lead.

---

## 🎯 Decisiones de diseño

### 1. ¿El vendedor sigue creando oportunidades después?
**No.** El vendedor **solo crea Leads**. Las oportunidades se promueven desde el Admin al convertir un Lead calificado.

### 2. Lead "abierto para todos los rubros"
El Lead se asocia a la `empresaId` (tenant) pero **NO está limitado al rubro del vendedor**. Ya garantizado en el modelo `Lead` actual.

### 3. Registro de actividad (NUEVO)
- Un Lead tiene **un historial de actividades** (bitácora).
- **Tipos**: `LLAMADA | EMAIL | VISITA | NOTA | WHATSAPP | REUNION`.
- Modelo relacional: `model Actividad { id, leadId, tipo, descripcion, fecha, autorId, ... }`.
- **Decisión UX**: el modal del vendedor pide **una primera actividad** al crear el lead → captura valor desde el primer click, sin requerir pantalla extra.

### 4. ¿Qué pasa con `prospects.prospectos` y el Kanban del Admin?
**Se mantienen intactos** en esta fase. El cambio es **mínimo invasivo**: solo el vendedor deja de crear oportunidad directamente. El Admin sigue con su Kanban y flujo de promoción Lead → Oportunidad.

---

## 📐 Diseño del nuevo modal del vendedor

```
┌─ Captar Lead ────────────────────────────────────┐
│ 🏢 Datos de la empresa captada:                  │
│   • Razón Social *                               │
│   • RIF (opcional, formato J-12345678-0)         │
│   • Email (opcional)                             │
│   • Teléfono (opcional)                          │
│   • Dirección (opcional) [campo NUEVO en Lead]   │
│ 👤 Contacto con el que se negocia:               │
│   • Nombre del Contacto *                        │
│   • Cargo / Autoridad (opcional)                 │
│ 📋 Registro de la actividad:                     │
│   • Tipo de actividad * [LLAMADA/EMAIL/          │
│     VISITA/NOTA/WHATSAPP/REUNION]                │
│   • Detalle / Descripción * [textarea]           │
│   • Fecha (default hoy)                          │
│                                                   │
│ [Cancelar] [Captar Lead]                         │
└───────────────────────────────────────────────────┘
```

---

## 📋 Cambios a realizar

### A. Backend (5 cambios + 3 nuevos)

#### 1. `backend/prisma/schema.prisma`
- ➕ Agregar enum `TipoActividad`.
- ➕ Agregar `model Actividad { id, empresaId, leadId, tipo, descripcion, fecha, autorId, createdAt, updatedAt }` con índices `(empresaId, leadId)` y `(leadId, fecha)`.
- ✏️ Agregar `direccion String?` al `model Lead`.
- ✏️ Agregar relación inversa `actividades Actividad[]` en `Lead`, `Usuario`, `Empresa`.

#### 2. Migración Prisma
```bash
npx prisma migrate dev --name add_actividad_module
```

#### 3. ➕ `backend/src/services/actividades.service.ts`
- `createActividad(context, leadId, input)`: valida que el lead pertenece al tenant y al vendedor (si rol=VENDEDOR), crea la actividad en transacción.
- `listActividades(context, leadId)`: retorna historial ordenado por `fecha DESC`.

#### 4. ➕ `backend/src/controllers/actividades.controller.ts`
- `POST /api/leads/:id/actividades` → `createActividad`.
- `GET /api/leads/:id/actividades` → `listActividades`.

#### 5. ➕ Rutas (merged en `backend/src/routes/leads.routes.ts`)
- Por RESTful anidado: `/api/leads/:id/actividades`.

#### 6. ✏️ `backend/src/services/leads.service.ts`
- `LeadInput` agrega `direccion?: string` y `primeraActividad?: { tipo, descripcion, fecha }`.
- `createLead` envuelve la creación del Lead + (opcional) primera actividad en `prisma.$transaction`.
- `listLeads` incluye `actividades: { orderBy: { fecha: 'desc' } }`.

#### 7. ✏️ `backend/src/controllers/leads.controller.ts`
- Aceptar los nuevos campos en el Zod schema.

#### 8. ✏️ `backend/src/docs/openapi.ts`
- Agregar schemas `Actividad`, `ActividadInput`, `TipoActividad`.
- Agregar endpoints `POST/GET /api/leads/{id}/actividades`.

---

### B. Frontend (5 cambios + 1 nuevo + 1 eliminado)

#### 1. ➕ `frontend/src/components/common/LeadCaptureModal.vue`
- Reemplaza a `ProspectModal.vue`.
- 3 secciones con fieldset/legend para claridad visual.
- Validación local (HTML5 + atributos `required`).
- Emite `submit` con payload `LeadInput & { primeraActividad: { tipo, descripcion, fecha } }`.
- Estilo coherente con el resto de la app (paleta `brand-*`).

#### 2. ✏️ `frontend/src/components/seller/SellerHeader.vue`
- Botón cambia de "+ Nuevo Prospecto" → **"+ Captar Lead"**.
- Evento emitido renombrado: `open-prospect-modal` → `open-lead-modal` (más claro semánticamente).

#### 3. ✏️ `frontend/src/views/SellerDashboard.vue`
- ❌ Eliminar import `useProspectsStore`, `ProspectModal`, tipo `EtapaOportunidad`.
- ✅ Agregar import `useLeadsStore`.
- Función `submitProspect` → renombrar a `submitLead`, llamar `leads.create(...)`.
- Wire-up del evento: `@open-lead-modal="showLeadModal = true"`.
- Reemplazar `<ProspectModal>` por `<LeadCaptureModal>` en el template.

#### 4. ✏️ `frontend/src/domain/lead.ts`
- Agregar `direccion: z.string().nullable()` a `LeadSchema` y `LeadInputSchema`.
- ➕ `TipoActividadSchema = z.enum([...])`.
- ➕ `ActividadSchema = z.object({...})`.
- ➕ `ActividadInputSchema = z.object({...})`.

#### 5. ➕ `frontend/src/services/actividades.api.ts`
- `addActividad(leadId, input)`.
- `listActividades(leadId)`.

#### 6. ✏️ `frontend/src/stores/leads.ts`
- Nuevo `activitiesByLead: Record<leadId, Actividad[]>`.
- Acción `addActivity(leadId, input)` que llama la API y agrega al mapa.
- Acción `loadActivities(leadId)`.

#### 7. ✏️ `frontend/src/views/AdminDashboard.vue`
- En la bandeja de leads (línea ~857), agregar por cada lead un **bloque expandible** con el timeline de actividades:
  ```
  [Fecha] [Tipo] Descripción — Autor
  ```
- Botón "+ Agregar actividad" por lead.

#### 8. ➖ Eliminar `frontend/src/components/common/ProspectModal.vue`
- Ya no se usa en ninguna parte.

---

## 📁 Inventario de archivos

### Backend
| Archivo | Acción |
|---|---|
| `backend/prisma/schema.prisma` | ✏️ Modificar |
| `backend/prisma/migrations/<timestamp>_add_actividad_module/` | ➕ Auto-generado |
| `backend/src/services/leads.service.ts` | ✏️ Modificar |
| `backend/src/controllers/leads.controller.ts` | ✏️ Modificar |
| `backend/src/services/actividades.service.ts` | ➕ Crear |
| `backend/src/controllers/actividades.controller.ts` | ➕ Crear |
| `backend/src/routes/leads.routes.ts` | ✏️ Modificar (agregar sub-routes de actividades) |
| `backend/src/docs/openapi.ts` | ✏️ Modificar |

### Frontend
| Archivo | Acción |
|---|---|
| `frontend/src/components/common/LeadCaptureModal.vue` | ➕ Crear |
| `frontend/src/components/common/ProspectModal.vue` | ➖ Eliminar |
| `frontend/src/components/seller/SellerHeader.vue` | ✏️ Modificar |
| `frontend/src/views/SellerDashboard.vue` | ✏️ Modificar |
| `frontend/src/domain/lead.ts` | ✏️ Modificar |
| `frontend/src/services/actividades.api.ts` | ➕ Crear |
| `frontend/src/stores/leads.ts` | ✏️ Modificar |
| `frontend/src/views/AdminDashboard.vue` | ✏️ Modificar |

---

## ⚠️ Riesgos y consideraciones

1. **Migración de BD**: agregar `direccion?` y crear `Actividad` requiere correr `npx prisma migrate dev` contra `dev.db`. Si hay datos en local se preservan (campos opcionales).
2. **El Admin (`AdminDashboard.vue`) tiene ~1560 líneas**: el cambio en la bandeja de leads es quirúrgico (insertar bloque expandible), pero hay que tener cuidado con el orden del template.
3. **Transacción atómica**: Lead + primera actividad deben crearse en una sola `prisma.$transaction` para evitar leads huérfanos sin actividad.
4. **Validación de la actividad**: `descripcion` mínimo 5 caracteres (UX), `fecha` default hoy.
5. **Multi-tenant**: vendedor solo crea actividades en sus propios leads (validar `vendedorId`).
6. **Cache offline**: si está activa la cola Dexie, hay que invalidar la cache de leads al agregar actividad.

---

## 🧪 Validación post-cambio

### Backend
```bash
cd backend
npx prisma migrate dev --name add_actividad_module
npx tsc --noEmit
# Smoke test del nuevo endpoint
curl -X POST http://localhost:3000/api/leads/<id>/actividades \
  -H "Content-Type: application/json" \
  -d '{"tipo":"LLAMADA","descripcion":"Llamada de presentación","fecha":"2026-09-04"}' \
  -b cookies.txt
```

### Frontend
```bash
cd frontend
npx tsc --noEmit
npx vite build
```

### Pruebas manuales
1. Login como vendedor → click "+ Captar Lead" → llenar 3 secciones → confirmar.
2. Backend (DB): verificar que el Lead se creó con su primera actividad asociada.
3. Login como Admin → bandeja de Leads → ver el lead nuevo → expandir → ver actividad en el timeline.
4. Como vendedor, agregar una 2da actividad al lead → verificar que se lista en orden cronológico inverso.

---

## 📌 Orden de ejecución recomendado

### 1. Backend primero:
1. Editar schema → `npx prisma migrate dev` → regenerar cliente.
2. Crear `actividades.service.ts` + `actividades.controller.ts` + rutas.
3. Modificar `leads.service.ts` para aceptar `direccion` + `primeraActividad` en transacción.
4. Actualizar OpenAPI.
5. `npx tsc --noEmit`.

### 2. Frontend después:
1. Crear `LeadCaptureModal.vue`.
2. Modificar `domain/lead.ts` con nuevos schemas.
3. Crear `actividades.api.ts`.
4. Modificar `stores/leads.ts`.
5. Modificar `SellerHeader.vue` (botón + evento).
6. Modificar `SellerDashboard.vue` (wire-up).
7. Modificar `AdminDashboard.vue` (timeline en bandeja).
8. Eliminar `ProspectModal.vue`.
9. `npx tsc --noEmit` + `npx vite build`.

---

## 🔗 Referencias útiles

- `backend/src/services/leads.service.ts` — Lógica actual de `createLead` (líneas 35-65).
- `backend/src/controllers/leads.controller.ts` — Zod schema actual (líneas 7-11).
- `backend/prisma/schema.prisma` — Modelos `Lead` (línea 259) y `Oportunidad` (línea 226).
- `frontend/src/components/common/ProspectModal.vue` — Modal actual a reemplazar.
- `frontend/src/views/SellerDashboard.vue` — Líneas 173-185 (handler de submit) y 284-293 (template del modal).
- `frontend/src/views/AdminDashboard.vue` — Modal de Captar Nuevo Lead (líneas 1480+) y bandeja de Leads (línea 859).

