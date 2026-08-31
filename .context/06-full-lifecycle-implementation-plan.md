# Plan de Implementación por Partes: Ciclo Completo CRM San Luis (De Lead a Postventa)

Basado en la **Guía de Ejecución CRM Corporativo San Luis (`.project/Guia_Ejecucion_CRM_Corporativo_San_Luis_v1.pdf`)**, la arquitectura multi-empresa y el análisis gap vs el código actual, este documento detalla **qué falta** para alcanzar el 100% de la visión corporativa y provee un **plan de implementación dividido en partes con sus prompts precisos** para que una IA los ejecute incrementalmente sin romper el proyecto existente.

---

## 1. Análisis de Brechas (Qué falta según la Guía .project)

1. **Gestión Formal de Leads (Fase Previa al Pipeline):**
   - *Estado actual:* El CRM maneja Oportunidades / Prospectos directamente en Kanban.
   - *Falta:* Una etapa formal de **Captación y Calificación de Leads** con criterios BANT/MEDDIC (Presupuesto, Autoridad, Necesidad, Tiempo) antes de promoverlos a Oportunidad o Cuenta.
2. **Ejecución de Venta (Pedidos y Facturación):**
   - *Estado actual:* Al convertir un prospecto, se crea el cliente corporativo y de empresa.
   - *Falta:* Generación de **Pedidos / Ordenes de Compra** y registro de Facturas asociadas con condiciones de pago y vinculación al inventario/facturación de Profit.
3. **Postventa, Soporte y SLAs:**
   - *Estado actual:* Matriz de cross-selling básica y visitas GPS.
   - *Falta:* Módulo de **Atención al Cliente, Casos / Soporte, SLAs** y seguimiento de renovaciones / upsell corporativo.
4. **KPIs Gerenciales Avanzados:**
   - *Estado actual:* Indicadores básicos en dashboards.
   - *Falta:* Métricas de **Win Rate (%)**, **Ciclo de Venta (días)**, **Costo por Lead** y **Margen por Producto/Unidad**.

---

## 2. Plan de Implementación por Partes (Prompts para la IA)

Cada prompt está diseñado para ser ejecutado de forma aislada, manteniendo la compilación TypeScript y la integridad de la arquitectura en capas.

---

### PARTE 1: Módulo de Leads y Calificación BANT/MEDDIC — COMPLETADA

> **Prompt 1 (Backend & Prisma):**
> "Actualiza `prisma/schema.prisma` añadiendo el modelo `Lead` con los campos: `id`, `empresaId`, `nombreContacto`, `empresaNombre`, `rif`, `email`, `telefono`, `fuente` (REDES, WEB, LLAMADA, REFERIDO), `estadoCalificacion` (NUEVO, CALIFICADO, DESCARTADO), `presupuesto`, `necesidad`, `autoridad`, `tiempo`, y `vendedorId`. Genera la migración de Prisma (`npx prisma migrate dev --name add_leads_module`). Luego, crea `src/routes/leads.routes.ts`, `src/controllers/leads.controller.ts` y `src/services/leads.service.ts` implementando el CRUD de leads y el endpoint para convertir un Lead calificado en `Oportunidad`."

> **Prompt 1.2 (Frontend Leads):**
> "Crea el servicio `frontend/src/services/leadsApi.ts`, el store Pinia `frontend/src/stores/leads.ts` y una vista/tab o sección en `AdminDashboard.vue` para gestionar la bandeja de entrada de Leads, permitiendo registrar nuevos leads, ver su calificación BANT y promoverlos directamente a Oportunidades en el Kanban."

**Verificación Parte 1:** modelo y migración aplicados, CRUD multiempresa operativo, calificación BANT/MEDDIC disponible, promoción a Oportunidad con trazabilidad `leadId`, seed con datos de prueba y build exitoso. Profit y las Partes 2 a 5 no forman parte de esta ejecución.

---

### PARTE 2: Módulo de Pedidos (Orders) y Facturación Asociada — COMPLETADA

> **Prompt 2 (Backend Pedidos):**
> "Actualiza `prisma/schema.prisma` agregando los modelos `Pedido` (campos: `id`, `empresaId`, `clienteEmpresaId`, `vendedorId`, `estado` ['PENDIENTE', 'APROBADO', 'FACTURADO', 'ANULADO'], `montoTotal`, `createdAt`, `updatedAt`) y `DetallePedido` (campos: `id`, `pedidoId`, `producto`, `cantidad`, `precioUnitario`). Ejecuta la migración Prisma. Crea los controladores y servicios en `src/services/pedidos.service.ts` y `src/routes/pedidos.routes.ts` para gestionar la emisión de pedidos al ganar una oportunidad."

> **Prompt 2.2 (Frontend Pedidos):**
> "En el frontend, agrega en el modal de conversión de oportunidades o en el tablero Kanban la opción de **'Generar Pedido / Orden'** conectada al store de pedidos y al nuevo endpoint backend, permitiendo listar los pedidos generados por empresa y vendedor."

**Verificación Parte 2:** modelos y migración aplicados, API multiempresa para crear/listar/actualizar pedidos, total calculado en servidor, store y servicio frontend, acceso administrativo a pedidos y build exitoso. Profit y las Partes 3 a 5 no forman parte de esta ejecución.


---

### PARTE 3: Módulo de Postventa, Soporte y SLAs

> **Prompt 3 (Backend Soporte & SLAs):**
> "Actualiza `prisma/schema.prisma` añadiendo el modelo `CasoSoporte` (campos: `id`, `empresaId`, `clienteEmpresaId`, `titulo`, `descripcion`, `prioridad` ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'], `estado` ['ABIERTO', 'EN_PROCESO', 'RESUELTO'], `slaHoras`, `createdAt`, `updatedAt`). Ejecuta la migración de Prisma. Implementa las rutas y servicios para gestión de tickets de soporte y renovación de contratos en postventa."

> **Prompt 3.2 (Frontend Postventa):**
> "Crea la vista o pestaña de **Postventa y Soporte** en `AdminDashboard.vue` con indicadores de SLAs cumplidos, listado de tickets activos y alertas de renovación/cross-sell para clientes corporativos del Grupo San Luis."

---

### PARTE 4: Analítica Avanzada (Win Rate, Ciclo de Venta y KPIs Gerenciales)

> **Prompt 4 (Analytics Service & UI):**
> "Crea el servicio `src/services/analytics.service.ts` que calcule métricas gerenciales clave: **Win Rate (%)**, **Ciclo Promedio de Venta (días)**, **Valor Total del Pipeline por Etapa**, y **Matriz de Consumo Consolidada por RIF**. Expón estas métricas en `dashboard.routes.ts` y actualiza los KPIs superiores en `AdminDashboard.vue` para reflejar analítica en tiempo real basada en datos reales de Prisma."

---

---

### PARTE 5: Suite de Pruebas E2E y Auditoría Visual (Playwright)

> **Prompt 5 (E2E & Visual Audit):**
> "Instala `@playwright/test` como dependencia de desarrollo (`npm i -D @playwright/test`). Configura `playwright.config.ts` en la raíz del proyecto para ejecutar pruebas automatizadas del ciclo completo de la aplicación. 
> Crea una suite de pruebas E2E visuales en `e2e/full-lifecycle.spec.ts` que simule las acciones del usuario y capture evidencias visuales en la carpeta `.screenshots-audit/`:
> 1. **Login y Selección de Tenant:** Inicio de sesión global y selección de empresa en el selector corporativo.
> 2. **Dashboard de Vendedor y Check-in GPS:** Verificación de métricas de vendedor y simulación de check-in geolocalizado.
> 3. **Dashboard de Administrador y Kanban:** Creación de un nuevo prospecto, cambio de etapa por arrastre/clic y actualización de KPIs en tiempo real.
> 4. **Mapa Leaflet y Matriz de Cross-Selling:** Verificación de la renderización del mapa interactivo y la matriz corporativa por RIF.
> Asegura que cada paso tome capturas de pantalla para auditoría visual y que la suite corra exitosamente mediante `npx playwright test`."


## 3. Instrucciones de Ejecución para la IA
1. Ejecutar las partes **en orden secuencial** (Parte 1 -> Parte 2 -> Parte 3 -> Parte 4).
2. Tras cada parte, ejecutar `npm run build` para validar que no existan errores de TypeScript ni fallas de compilación en Vite.
3. No modificar esquemas existentes a menos que sea una relación complementaria (Foreign Key opcional).
