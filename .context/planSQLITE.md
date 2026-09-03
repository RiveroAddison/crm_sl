# Plan de implementación SQLite

## Objetivo

Hacer oficial el nombre `CuentaComercial` en Prisma y físicamente en SQLite, reemplazando:

- Tabla `EmpresaCliente` por `CuentaComercial`.
- Columnas `empresaClienteId` por `cuentaComercialId` en `Lead`, `Oportunidad` y `Pedido`.

Las migraciones históricas no se modifican. El cambio se incorpora mediante una migración nueva.

## Estado actual

Actualmente el esquema Prisma usa nombres lógicos nuevos, pero conserva los nombres físicos antiguos:

```prisma
model CuentaComercial {
  // ...
  @@map("EmpresaCliente")
}
```

Y las relaciones utilizan:

```prisma
cuentaComercialId String? @map("empresaClienteId")
```

El objetivo de este plan es retirar esos mapeos.

## Requisitos previos

Ejecutar desde la raíz del proyecto:

```bash
cd /home/usuario/desarrollo/crm_sl
npm install
```

Confirmar que la base utilizada sea la esperada en `backend/.env`:

```env
DATABASE_URL="file:./dev.db"
```

Este procedimiento es destructivo si se usa `migrate reset`. Aplicarlo únicamente porque la base actual contiene datos de prueba.

## Paso 1: respaldar la base

Desde la raíz:

```bash
cp backend/prisma/dev.db backend/prisma/dev.db.before-cuenta-comercial.bak
```

Comprobar que el respaldo exista:

```bash
ls -lh backend/prisma/dev.db*
```

Si la base no existe, continuar directamente con la recreación mediante Prisma.

## Paso 2: comprobar duplicados e integridad

Antes del cambio físico, revisar duplicados por RIF y nombre:

```bash
sqlite3 backend/prisma/dev.db "SELECT empresaId, rif, COUNT(*) FROM EmpresaCliente WHERE rif IS NOT NULL GROUP BY empresaId, rif HAVING COUNT(*) > 1;"
```

```bash
sqlite3 backend/prisma/dev.db "SELECT empresaId, nombre, COUNT(*) FROM EmpresaCliente GROUP BY empresaId, nombre HAVING COUNT(*) > 1;"
```

Comprobar claves foráneas:

```bash
sqlite3 backend/prisma/dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"
```

Si existen datos productivos, no continuar sin resolver duplicados y respaldar la base.

## Paso 3: retirar mapeos físicos de Prisma

En `backend/prisma/schema.prisma`:

1. Eliminar `@@map("EmpresaCliente")` del modelo `CuentaComercial`.
2. Eliminar `@map("empresaClienteId")` de `Lead.cuentaComercialId`.
3. Eliminar `@map("empresaClienteId")` de `Oportunidad.cuentaComercialId`.
4. Eliminar `@map("empresaClienteId")` de `Pedido.cuentaComercialId`.
5. Mantener las relaciones con `CuentaComercial`.
6. Mantener la unicidad por `empresaId + rif` y `empresaId + nombre`.

El resultado esperado es similar a:

```prisma
model CuentaComercial {
  id       String @id @default(uuid())
  empresaId String
  nombre   String
  rif      String?

  // relaciones...

  @@unique([empresaId, nombre])
  @@unique([empresaId, rif])
  @@index([empresaId, rif])
}
```

Y:

```prisma
cuentaComercialId String?
```

## Paso 4: validar el esquema

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
npm run build
```

No continuar si Prisma reporta errores.

## Paso 5: crear la migración física

### Opción recomendada para datos de prueba

Como la base contiene datos de prueba, reconstruirla es lo más seguro:

```bash
cd backend
npx prisma migrate reset --force
```

Este comando:

1. Elimina la base local.
2. Aplica todas las migraciones históricas.
3. Ejecuta el seed.
4. Crea físicamente `CuentaComercial` y `cuentaComercialId` desde el esquema actual.

### Opción para conservar datos

Si posteriormente se necesita conservar datos, crear una migración explícita sobre una copia de la base:

```bash
cd backend
npx prisma migrate dev --name rename_empresa_cliente_to_cuenta_comercial
```

Revisar el SQL generado antes de aplicarlo. En SQLite, Prisma puede reconstruir las tablas relacionadas. La migración debe preservar:

- IDs existentes.
- Relaciones de `Lead`.
- Relaciones de `Oportunidad`.
- Relaciones de `Pedido`.
- Índices y restricciones únicas.

La migración física esperada debe equivaler conceptualmente a:

```sql
ALTER TABLE "EmpresaCliente" RENAME TO "CuentaComercial";
```

Y las tablas dependientes deben terminar usando la columna `cuentaComercialId`, con sus claves foráneas apuntando a `CuentaComercial`.

No editar migraciones antiguas. Si Prisma genera una reconstrucción, revisar especialmente los `INSERT INTO ... SELECT ...` para que no se pierdan columnas ni IDs.

## Paso 6: regenerar y revisar consultas

```bash
cd backend
npm run prisma:generate
npm run build
```

Buscar referencias físicas antiguas:

```bash
cd ..
grep -R "EmpresaCliente\|empresaClienteId" backend/src backend/prisma/schema.prisma --exclude-dir=dist
```

Las apariciones permitidas deben limitarse a:

- Migraciones históricas.
- Documentación de compatibilidad o historial.
- Aliases de API durante el período de transición, si se mantienen.

Las consultas nuevas deben usar:

```text
prisma.cuentaComercial
cuentaComercialId
```

## Paso 7: verificar las tablas físicas

```bash
sqlite3 backend/prisma/dev.db ".tables"
```

Confirmar que aparezca:

```text
CuentaComercial
```

Y que no se use `EmpresaCliente` como tabla activa.

Revisar columnas:

```bash
sqlite3 backend/prisma/dev.db "PRAGMA table_info('CuentaComercial');"
sqlite3 backend/prisma/dev.db "PRAGMA table_info('Lead');"
sqlite3 backend/prisma/dev.db "PRAGMA table_info('Oportunidad');"
sqlite3 backend/prisma/dev.db "PRAGMA table_info('Pedido');"
```

Comprobar integridad:

```bash
sqlite3 backend/prisma/dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"
```

## Paso 8: comprobar el seed

```bash
cd backend
npm run prisma:seed
```

El seed debe ser idempotente y limpiar las entidades dependientes antes de crear usuarios, empresas y accesos.

Verificar conteos:

```bash
node -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); Promise.all([p.usuario.count(),p.empresa.count(),p.usuarioEmpresa.count(),p.cuentaComercial.count(),p.lead.count(),p.oportunidad.count(),p.pedido.count()]).then(([usuarios,empresas,accesos,cuentas,leads,oportunidades,pedidos])=>console.log({usuarios,empresas,accesos,cuentas,leads,oportunidades,pedidos})).finally(()=>p.$disconnect())'
```

Estado esperado para una base de pruebas:

```text
usuarios: 3
empresas: 2
accesos: 4
cuentas: 0
leads: 0
oportunidades: 0
pedidos: 0
```

## Paso 9: verificar contratos y frontend

```bash
cd /home/usuario/desarrollo/crm_sl
npm run build:frontend
```

Confirmar que frontend y backend usen `cuentaComercialId` como nombre canónico. `empresaClienteId` solo debe conservarse como alias temporal si existen clientes antiguos.

Verificar que funcionen:

- Selector de cuenta comercial en el dashboard administrativo.
- Selector de cuenta comercial en el dashboard del vendedor.
- Creación de lead.
- Creación de oportunidad.
- Conversión de lead a oportunidad.
- Creación de pedido desde una oportunidad convertida.

## Paso 10: prueba HTTP completa

Iniciar la API:

```bash
cd backend
npm run dev
```

En otra terminal:

```bash
curl -i http://localhost:4500/api/docs.json
```

Debe responder `200`.

Probar el flujo autenticado desde la interfaz o con un cliente HTTP:

1. Login con un usuario cargado por el seed.
2. Selección de empresa.
3. Crear una `CuentaComercial`.
4. Crear un `Lead` con `cuentaComercialId`.
5. Marcar el lead como `CALIFICADO`.
6. Convertirlo a `Oportunidad`.
7. Confirmar que la oportunidad conserva `cuentaComercialId`.
8. Convertir la oportunidad a `ClienteCorporativo` y `ClienteEmpresa`.
9. Crear un `Pedido` usando `clienteEmpresaId` y la oportunidad.

Casos de rechazo obligatorios:

- ID de cuenta inexistente: `404`.
- Cuenta perteneciente a otro tenant: `404` o `409`.
- RIF incompatible con la cuenta seleccionada: `409`.
- Cuenta duplicada por RIF o nombre normalizado: `409`.
- Oportunidad no convertida usada para crear pedido: `400`.
- Cliente operativo que no corresponde a la oportunidad: `400`.

## Paso 11: validación final

```bash
cd /home/usuario/desarrollo/crm_sl/backend
npm run prisma:validate
npm run prisma:generate
npm run build
npx prisma migrate status
npm run prisma:repair-accounts
```

```bash
cd /home/usuario/desarrollo/crm_sl
npm run build:frontend
git diff --check
```

El resultado esperado es:

- Esquema Prisma válido.
- Base sincronizada.
- Tabla física `CuentaComercial`.
- Sin errores de claves foráneas.
- Sin duplicados de RIF.
- Backend compilado.
- Frontend compilado.
- Flujo de lead a oportunidad operativo.

## Rollback

Si la migración falla:

```bash
cp backend/prisma/dev.db.before-cuenta-comercial.bak backend/prisma/dev.db
```

Para una base exclusivamente de pruebas, reconstruir desde cero:

```bash
cd backend
npx prisma migrate reset --force
```

No usar `git reset`, `git checkout` ni modificar migraciones históricas para revertir este cambio.

## Decisión operativa

Dado que la base actual contiene datos de prueba, la secuencia recomendada es:

```bash
cd /home/usuario/desarrollo/crm_sl/backend
npx prisma migrate reset --force
npm run prisma:validate
npm run prisma:generate
npm run build
cd ..
npm run build:frontend
```

Antes de ejecutar esta secuencia, retirar los `@@map` y `@map` indicados en el Paso 3. Después verificar físicamente que la tabla se llame `CuentaComercial`.
