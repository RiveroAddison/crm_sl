# Tech Stack y Reglas de Desarrollo

## Backend
- **Runtime & Framework:** Node.js + Express.js (TypeScript).
- **ORM / Query Builder:** Prisma (para la BD SQLite del CRM) + `mssql` / Knex (para lecturas a bases de datos Profit SQL Server).
- **Base de Datos CRM (Servidor):** SQLite (Solo para Auth, Maestro Corporativo, Pipelines y Metadata).
- **Bases de Datos ERP:** SQL Server de Profit (Instancias independientes por empresa).
- **Validaciones:** Zod para DTOs y validación de esquemas de entrada/salida.

## Frontend & PWA
- **Framework:** Vue 3 (Composition API con `<script setup>`).
- **State Management:** Pinia.
- **Router:** Vue Router 4.
- **Estilos:** Tailwind CSS / UI Library.
- **Estrategia Offline:** PWA con IndexedDB (Dexie.js) / SQLite Wasm (OPFS).
- **Sync Protocol:** Cola de transacciones locales basándote en UUIDs con retry automático.

## Reglas de Código para la IA
- Escribir código fuertemente tipado en TypeScript.
- Mantener funciones pequeñas y de responsabilidad única.
- Manejo explícito de errores con bloques `try/catch` y respuestas HTTP estandarizadas `{ success: boolean, data: any, error: string }`.