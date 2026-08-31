# Auditoría Senior Fullstack, Prompts y Plan de Implementación

## 1. Resumen de Auditoría y Brechas Detectadas

Como Senior Fullstack Developer, he realizado un análisis detallado de la carpeta `.context/` (`01-tech-stack.md`, `02-architecture-and-context.md`, `03-database-schema-guide.md`) y de las capturas de pantalla de la interfaz en `.screenshots/` (`cap1.png`, `cap2.png`, `cap3.png`), contrastándolos con el código actual del backend y frontend.

### A. Estado Actual
1. **Autenticación Multi-tenant (2 Pasos):** Implementada en `src/server.ts` y `frontend/src/stores/auth.ts`.
2. **Dashboard de Vendedor (`cap1.png`):** Implementado con indicadores, planificador de rutas semanal (S1-S4 / Lunes-Viernes), histograma de ventas de 9 meses, check-in GPS y alta/listado de prospectos.
3. **Dashboard de Administrador / Pipeline (`cap2.png`, `cap3.png`):** Implementado con Kanban, Tabla de Prospectos, creación y cambio de etapa persistidos, además de mapa Leaflet con marcadores.

### B. Oportunidades de Mejora y Brechas Críticas
1. **Pipeline Comercial Dinámico:**
   - El modelo `Oportunidad`, sus endpoints, validación Zod, store Pinia, modal, Kanban y Tabla ya están implementados.
   - La conversión a cliente ya crea o reutiliza `ClienteCorporativo` y `ClienteEmpresa` dentro de una transacción, y guarda la relación en `Oportunidad`.
2. **Check-in GPS y Mapa Leaflet:**
   - El frontend captura coordenadas con `navigator.geolocation` y renderiza marcadores Leaflet.
   - La persistencia de `latitud`, `longitud` y `comentario` en `VisitaCliente`, junto con los endpoints backend de check-in, ya está implementada.
3. **Estructura del Backend:**
   - La API cuenta con routers y controladores modulares para autenticación, dashboard, prospectos y visitas; `src/server.ts` solo compone la aplicación.
4. **Conexión a BDs de Profit (SQL Server) & Offline PWA:**
   - El adaptador `mssql` para lectura segura por empresa ya está implementado; faltan las consultas reales según el esquema de cada BD Profit.
   - La cola IndexedDB con Dexie.js y el service worker ya están configurados para operaciones pendientes, y los endpoints GPS ya aceptan su reintento.


---

## 2. Prompts para Aplicar Cambios Necesarios

Los siguientes prompts están estructurados de forma modular para ejecutarse secuencialmente:

### Prompt 1: Ampliación de Esquema Prisma y Migración de Datos (Oportunidades & Geolocalización)
> "Actualiza `prisma/schema.prisma` añadiendo el modelo `Oportunidad` (con campos: id, empresaId, clienteCorporativoId, vendedorId, titulo, etapa ['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO'], valorEstimado, fechaContacto, createdAt, updatedAt) y extiende `VisitaCliente` con `latitud`, `longitud` y `comentario`. Genera la migración de Prisma (`npx prisma migrate dev --name add_prospects_and_gps`) y actualiza `prisma/seed.ts` con prospectos realistas que coincidan con `.screenshots/cap2.png`."

### Prompt 2: Refactorización Arquitectónica del Backend Express en Capas
> "Refactoriza el backend de `src/server.ts` organizando el código bajo principios SOLID y arquitectura modular de capas en `src/`:
> - `src/routes/`: `auth.routes.ts`, `dashboard.routes.ts`, `prospectos.routes.ts`, `visitas.routes.ts`
> - `src/controllers/`: `auth.controller.ts`, `dashboard.controller.ts`, `prospectos.controller.ts`, `visitas.controller.ts`
> - `src/services/`: `auth.service.ts`, `dashboard.service.ts`, `prospectos.service.ts`, `visitas.service.ts`
> - `src/middlewares/`: `auth.middleware.ts`, `error.middleware.ts`
> Asegura que todas las respuestas mantengan el estándar `{ success: boolean, data: any, error: string }`."

### Prompt 3: Implementación del CRUD de Prospectos, Modal y Tablero Kanban Dinámico
> "Crea el servicio `prospectosApi.ts` y el store Pinia `prospects.ts` en el frontend. En `AdminDashboard.vue`, conecta las acciones del Kanban y la Tabla de Prospectos:
> - Agregar un modal interactivo para **+ Nuevo Prospecto** con validación Zod.
> - Permitir cambiar la etapa de un prospecto (Nuevo -> En Negociación -> Convertido -> Rechazado) desde las tarjetas Kanban o la tabla con persistencia en la API.
> - Recalcular dinámicamente los KPIs: Prospectos Activos, Valor del Pipeline y Tasa de Conversión."

### Prompt 4: Integración de Leaflet GPS para Visitas y Check-ins de Vendedores
> "Instala `leaflet` y `@types/leaflet`. En `SellerDashboard.vue`, implementa la acción 'Marcar Visita / Check-in' capturando coordenadas GPS mediante `navigator.geolocation`. En `AdminDashboard.vue`, integra el mapa de Leaflet en la pestaña 'Mapa Leaflet GPS' para renderizar los marcadores e información de los check-ins realizados por los vendedores."

### Prompt 5: Conexión con SQL Server Profit & Estrategia Offline/PWA
> "Agrega el servicio `src/services/profitSync.service.ts` usando `mssql` para realizar lecturas de clientes y facturación desde las instancias de Profit SQL Server configuradas por empresa. Configura el Service Worker y la cola de transacciones locales con Dexie.js (IndexedDB) para la estrategia offline PWA descrita en `.context/01-tech-stack.md`."

---

## 3. Plan de Implementación (Roadmap)

### Fase 1: Persistencia y Modelo de Datos (Prisma)
- [x] Análisis del esquema actual.
- [x] Agregar campos GPS (`latitud`, `longitud`, `comentario`) en `VisitaCliente` (el modelo `Oportunidad` ya está listo).
- [x] Ejecutar migración de Prisma y actualizar `prisma/seed.ts` con datos de prueba de prospectos.

### Fase 2: Modularización del Backend
- [x] Crear estructura de directorios `routes/`, `controllers/`, `services/`, `middlewares/`.
- [x] Migrar lógica de autenticación y contexto a sus respectivos controladores y servicios.
- [x] Implementar rutas CRUD para prospectos y Check-in de Visitas GPS.

### Fase 3: Frontend - Pipeline Comercial y Kanban
- [x] Implementar `prospectosApi.ts` y store de Pinia.
- [x] Crear modal de formulario para creación de prospectos.
- [x] Habilitar actualización de etapas en Kanban y sincronización con el backend.

### Fase 4: Frontend - Geolocalización y Mapa Leaflet
- [x] Integrar captador de coordenadas GPS en la vista del vendedor.
- [x] Cargar paquete Leaflet.js en la vista de administración e integrar marcadores de mapa interactivos.

### Fase 5: Conexión Profit & PWA Offline
- [ ] Proveer adaptador y consultas reales para SQL Server Profit (pospuesto).
- [x] Configurar IndexedDB / Dexie.js para soporte PWA offline y reintento de sincronización.
