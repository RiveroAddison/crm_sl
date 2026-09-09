# Plan 00: Reestructuración Backend Security & Compatibilidad Frontend

**Fecha:** 2026-09-09
**Prioridad:** 🔴 CRÍTICO
**Estado:** ✅ Completado (9/9 planes + endpoint de prueba)
**Objetivo:** Eliminar vulnerabilidades de seguridad críticas en el backend y mantener compatibilidad con el frontend existente.

---

## Resumen de Cambios Implementados

### Plan 01: JWT Secrets Seguros
- **Archivo:** `src/lib/auth.ts`
- **Cambio:** Eliminados fallbacks predeterminados. Lanza error si `JWT_SECRET`/`JWT_REFRESH_SECRET` no están configurados en producción.
- **Resultado:** Tokens JWT no pueden firmarse con secretos débiles.

### Plan 02: Ocultar Credenciales en Respuestas
- **Archivos:** `src/controllers/empresas.controller.ts`, `src/controllers/profit.controller.ts`
- **Cambio:** Excluido `profitDbPassword` de los `select` de Prisma en list/get/create/update de empresas y en `getStatus` de profit.
- **Resultado:** Credenciales SQL Server nunca se exponen en respuestas HTTP.

### Plan 03: Sanitización de Errores
- **Archivo nuevo:** `src/utils/errors.ts`
- **Archivos modificados:** 7 controladores (leads, pedidos, actividades, actividadesOportunidad, tiposCliente, prospectos, visitas)
- **Cambio:** Creadas funciones `sanitizeError()` y `errorStatus()` que ocultan detalles internos (stack traces, paths de archivos) y retornan mensajes genéricos al cliente.
- **Resultado:** No se filtra información sensible del servidor en errores.

### Plan 04: Middleware de Autenticación Express
- **Archivo:** `src/middleware/auth.ts`
- **Archivos modificados:** Todos los archivos de rutas y controladores (leads, prospectos, pedidos, tiposCliente, usuarios, visitas, empresasClientes, actividadesOportunidad, actividades)
- **Cambio:** Implementados `requireAuth`, `requireMasterOrAdmin`, `requireMaster` como middlewares Express con patrón `req.context`. Se eliminaron validaciones manuales repetitivas en cada controlador.
- **Resultado:** Autorización centralizada, código más limpio, menor riesgo de olvidar validar permisos.

### Plan 05: Logging en Bloques Catch
- **Archivos:** 11 archivos con ~24 bloques catch silenciosos
- **Cambio:** Agregado `console.error` con contexto en todos los catch blocks que estaban vacíos.
- **Resultado:** Los errores ahora se registran para debugging y monitoreo.

### Plan 06: Logging Estructurado (Pino)
- **Archivo nuevo:** `src/lib/logger.ts`
- **Archivos modificados:** 18 archivos con ~49 llamadas a `console.*`
- **Cambio:** Instalado `pino`. Reemplazados todos `console.log/warn/error` por `logger.info/warn/error` con redacción automática de campos sensibles (`password`, `token`, `secret`, `authorization`).
- **Resultado:** Logs estructurados en JSON, campos sensibles redactados automáticamente, rendimiento superior a console.

### Plan 07: Cifrado de Credenciales en BD
- **Archivo nuevo:** `src/lib/encryption.ts` (AES-256-GCM)
- **Archivos modificados:** `src/lib/profitConnection.ts`, `src/controllers/empresas.controller.ts`, `src/services/empresas.service.ts`
- **Cambio:** Creado sistema de cifrado con `ENCRYPTION_KEY` (32 bytes hex). Contraseñas SQL Server se cifran antes de guardarse y descifran antes de usarlas.
- **Resultado:** Credenciales almacenadas cifradas en SQLite, no en texto plano.

### Plan 08: Hardening de Cookies
- **Archivo:** `src/lib/cookies.ts`
- **Cambio:** `secure: true` forzado (vía `COOKIE_SECURE` env o `NODE_ENV`), refresh cookie usa `sameSite: 'strict'`.
- **Resultado:** Cookies protegidas contra ataques CSRF y MITM.

### Plan 09: Rate Limiting con Redis
- **Archivo:** `src/utils/rateLimit.ts`
- **Cambio:** Instalado `rate-limit-redis` + `ioredis`. Store Redis con fallback a memoria si Redis no está disponible.
- **Resultado:** Rate limiting distribuido en producción, funcional sin Redis en desarrollo.

---

## Endpoint Nuevo: Test de Conexión

### Backend
- **Controlador:** `src/controllers/empresas.controller.ts` — función `testConnection`
- **Ruta:** `POST /api/empresas/:id/test-connection` (protegida con `requireMasterOrAdmin`)
- **Funcionalidad:** Usa credenciales almacenadas (cifradas) para probar conexión a Profit Plus. No necesita password en el request.

### Frontend
- **API:** `frontend/src/services/admin.api.ts` — método `testConnectionByEmpresaId(empresaId)`
- **Vista:** `frontend/src/views/AdminDashboard.vue` — función `testCurrentEmpresaConnection()` actualizada
- **Resultado:** El botón "Probar Conexión" usa el endpoint seguro sin enviar contraseña en el body.

---

## Archivos Modificados (Resumen)

### Backend (`backend/src/`)
| Archivo | Cambios |
|---------|---------|
| `lib/auth.ts` | JWT secrets validation |
| `lib/encryption.ts` | **NUEVO** — AES-256-GCM encrypt/decrypt |
| `lib/logger.ts` | **NUEVO** — Pino structured logger |
| `lib/cookies.ts` | Cookie security hardening |
| `lib/profitConnection.ts` | Decrypt before use |
| `middleware/auth.ts` | `requireAuth`, `requireMasterOrAdmin`, `requireMaster` |
| `utils/errors.ts` | **NUEVO** — `sanitizeError()`, `errorStatus()` |
| `utils/rateLimit.ts` | Redis store with memory fallback |
| `controllers/empresas.controller.ts` | Hidden password in select, encrypt on save, test-connection endpoint |
| `controllers/profit.controller.ts` | Hidden profitDbHost/Name from getStatus |
| `routes/empresas.routes.ts` | New `POST /:id/test-connection` route |
| `services/empresas.service.ts` | Encrypt during sync |
| `controllers/leads.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/pedidos.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/actividades.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/actividadesOportunidad.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/tiposCliente.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/prospectos.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/visitas.controller.ts` | Sanitize errors, auth middleware, pino logging |
| `controllers/usuarios.controller.ts` | Auth middleware, pino logging |

### Frontend (`frontend/src/`)
| Archivo | Cambios |
|---------|---------|
| `services/admin.api.ts` | Added `testConnectionByEmpresaId()` |
| `views/AdminDashboard.vue` | Updated `testCurrentEmpresaConnection()` |

---

## Verificación

- ✅ `npx tsc --noEmit` (backend) — sin errores
- ✅ `npm run build` (frontend) — build exitoso
- ✅ Servidor inicia correctamente tras cada plan

---

## Pendiente / Futuro

- [ ] **Migrar a Redis real** cuando esté disponible en el entorno de producción (actualmente usa fallback a memoria)
- [ ] **Auditar endpoints** faltantes de autenticación (si los hay)
- [ ] **Rate limiting por endpoint** — configurar límites específicos por ruta
- [ ] **Cifrado de campos adicionales** — considerar cifrar otros datos sensibles
- [ ] **Refresh token rotation** — implementar rotación automática de refresh tokens
- [ ] **Logs centralizados** — integrar con sistema de monitoreo (ELK, Datadog, etc.)
- [ ] **Tests de seguridad** — crear tests automatizados para validar las protecciones implementadas
