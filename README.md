# CRM Grupo San Luis

## Inicio

1. Copia `.env.example` como `.env` y define un `JWT_SECRET` aleatorio.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm run prisma:migrate` para crear la SQLite.
4. Ejecuta `npm run prisma:seed` para cargar datos de prueba.
5. Inicia API y frontend con `npm run dev`.

Frontend: http://localhost:5173
API: http://localhost:3000

## Modelo comercial

El CRM separa la organización externa captada por ventas de la empresa interna que actúa como tenant:

- `Empresa`: unidad de negocio interna y tenant activo.
- `CuentaComercial`: organización externa relacionada con el CRM. La tabla física en SQLite se llama `CuentaComercial` (migración completada).
- `Lead`: contacto inicial, asignado a una cuenta comercial.
- `Oportunidad`: negocio potencial calificado, relacionado con un lead y una cuenta comercial.
- `ClienteCorporativo`: identidad fiscal consolidada globalmente por RIF.
- `ClienteEmpresa`: cliente operativo dentro de una empresa, con código de Profit.
- `Pedido`: orden sobre un `ClienteEmpresa`; puede conservar la cuenta comercial como origen.

El flujo recomendado es:

```text
Lead -> Oportunidad -> ClienteCorporativo + ClienteEmpresa -> Pedido
				 \-> CuentaComercial permanece como contexto comercial
```

### Estado de la migración CuentaComercial

La migración del nombre físico `EmpresaCliente` a `CuentaComercial` ha sido completada exitosamente. Los cambios realizados:

- **Esquema Prisma**: Se eliminaron los mapeos `@@map("EmpresaCliente")` y `@map("empresaClienteId")`.
- **Base SQLite**: La tabla física ahora se llama `CuentaComercial` con la columna `cuentaComercialId` en `Lead`, `Oportunidad` y `Pedido`.
- **API**: Los endpoints usan `cuentaComercialId` como nombre canónico. `empresaClienteId` se mantiene como alias temporal para compatibilidad con clientes existentes.

La API acepta temporalmente `cuentaComercialId` y `empresaClienteId`; el primero es el nombre canónico y el segundo es un alias legado. Las nuevas integraciones deben usar `cuentaComercialId`.

### Resolución de una cuenta comercial

Leads, oportunidades y pedidos comparten el servicio `backend/src/services/cuentasComerciales.service.ts`. La resolución se realiza en este orden:

1. ID explícito, validado contra la empresa del contexto y con `activo = true`.
2. RIF normalizado por empresa.
3. Nombre normalizado por empresa.
4. Creación automática solo si el flujo lo permite.

Un ID inexistente o perteneciente a otro tenant se rechaza. Si el RIF enviado no coincide con la cuenta seleccionada, también se rechaza. `ClienteEmpresa` continúa siendo la referencia operativa para cartera, visitas, ventas y pedidos.

### Verificación de la migración

Para verificar que la migración se completó correctamente:

```bash
# Verificar tablas físicas
sqlite3 backend/prisma/dev.db ".tables" | grep -o "CuentaComercial"
# Resultado esperado: CuentaComercial

# Verificar columnas
sqlite3 backend/prisma/dev.db "PRAGMA table_info('Lead');" | grep cuentaComercialId
sqlite3 backend/prisma/dev.db "PRAGMA table_info('Oportunidad');" | grep cuentaComercialId
sqlite3 backend/prisma/dev.db "PRAGMA table_info('Pedido');" | grep cuentaComercialId

# Verificar integridad referencial
sqlite3 backend/prisma/dev.db "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;"
# Resultado esperado: sin salida (sin errores)
```

### Verificación de backend

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
npm run build
npx prisma migrate status
npm run prisma:repair-accounts
```

`prisma:repair-accounts` normaliza RIF y nombres, repara relaciones nulas solo con una coincidencia única y reporta duplicados o ambigüedades. Ejecutarlo después de respaldar `backend/prisma/dev.db`.

### Pruebas HTTP

Para verificar el flujo completo:

```bash
cd backend
npm run dev

# En otra terminal:
curl -i http://localhost:4500/api/docs.json
# Debe responder 200

# Login
curl -X POST http://localhost:4500/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5179" \
  -d '{"email":"master@sanluis.com","password":"admin1234"}'

# Seleccionar contexto de empresa
curl -X POST http://localhost:4500/api/auth/context \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5179" \
  -H "Authorization: Bearer <preAuthToken>" \
  -d '{"empresaId":"<empresaId>"}'

# Crear cuenta comercial
curl -X POST http://localhost:4500/api/empresas-clientes \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5179" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"nombre":"Cliente Test","rif":"J-12345678-9"}'

# Crear lead con cuentaComercialId
curl -X POST http://localhost:4500/api/leads \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5179" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"nombreContacto":"Juan Perez","empresaNombre":"Empresa Test","fuente":"WEB","cuentaComercialId":"<cuentaComercialId>"}'

# Calificar lead
curl -X PATCH http://localhost:4500/api/leads/<leadId> \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5179" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"estadoCalificacion":"CALIFICADO"}'

# Convertir lead a oportunidad
curl -X POST http://localhost:4500/api/leads/<leadId>/convert \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5179" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"titulo":"Oportunidad de prueba","valorEstimado":10000}'
```

### Rollback

Si la migración falla, restaurar el respaldo:

```bash
cp backend/prisma/dev.db.before-cuenta-comercial.bak backend/prisma/dev.db
```

Para una base de pruebas, reconstruir desde cero:

```bash
cd backend
npx prisma migrate reset --force
```

### Usuarios de prueba

Todos los usuarios utilizan la contraseña `admin1234`.

| Rol | Correo | Empresas |
| --- | --- | --- |
| MASTER | `master@sanluis.com` | San Luis Lubricantes / San Luis Combustible |
| VENDEDOR | `cperez@sanluis.com` | San Luis Lubricantes / San Luis Combustible |
| VENDEDOR | `mgonzalez@sanluis.com` | San Luis Lubricantes / San Luis Combustible |
