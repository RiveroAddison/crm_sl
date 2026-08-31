# CRM Grupo San Luis

## Inicio

1. Copia `.env.example` como `.env` y define un `JWT_SECRET` aleatorio.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm run prisma:migrate` para crear la SQLite.
4. Ejecuta `npm run prisma:seed` para cargar datos de prueba.
5. Inicia API y frontend con `npm run dev`.

Frontend: http://localhost:5173
API: http://localhost:3000

El login ocurre en dos pasos: credenciales globales y selección de una empresa autorizada. El JWT final incluye `userId`, `empresaId` y `rol`.

### Usuarios de prueba

Todos los usuarios utilizan la contraseña `Demo1234!`.

| Rol | Correo | Empresas |
| --- | --- | --- |
| MASTER | `master@gruposanluis.com` | Combustibles / Logistica (Acceso Global) |
| ADMIN / VENDEDOR | `demo@gruposanluis.com` | Combustibles / Logistica |
| ADMIN | `admin.combustibles@gruposanluis.com` | Combustibles |
| ADMIN | `admin.logistica@gruposanluis.com` | Logistica |
| ADMIN | `admin.grupo@gruposanluis.com` | Combustibles / Logistica |
| VENDEDOR | `v` | Combustibles |
| VENDEDOR | `vendedor.carlos@gruposanluis.com` | Combustibles |
| VENDEDOR | `vendedor.diana@gruposanluis.com` | Combustibles / Logistica |
| VENDEDOR | `vendedor.ernesto@gruposanluis.com` | Logistica |
| VENDEDOR | `vendedor.laura@gruposanluis.com` | Logistica |
| VENDEDOR | `vendedor.miguel@gruposanluis.com` | Logistica |
