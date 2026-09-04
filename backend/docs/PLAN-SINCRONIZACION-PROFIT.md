# Plan de Sincronización Profit CRM

## Objetivo

Implementar la sincronización de datos desde el SQL Server remoto de Profit hacia la base de datos local del CRM, sin modificar las tablas de Profit.

La sincronización utilizará la empresa local `San Luis` y estas consultas fuente:

```sql
SELECT * FROM AD_DIST.DBO.CRM_VENDEDOR;

SELECT * FROM AD_DIST.DBO.CRM_CLIENTE;

SELECT *
FROM AD_DIST.DBO.CRM_VENTAS
WHERE fecha >= @fechaInicio
  AND fecha < @fechaFin;
```

El rango de ventas será móvil: siempre los últimos 9 meses a partir de la fecha actual del servidor donde se ejecuta el backend.

## Alcance

### 1. Vendedores

Tabla fuente: `AD_DIST.DBO.CRM_VENDEDOR`

Columnas observadas:

- `cod`
- `nombre`
- `correo`

Destino local:

- `Usuario`
- `UsuarioEmpresa`

Reglas iniciales:

- Guardar el nombre del vendedor.
- Generar el correo como `<nombre>@sanluis.com.ve`.
- Usar la contraseña inicial `1234` y almacenarla con bcrypt.
- Asociar el usuario a la empresa con rol `VENDEDOR`.
- Conservar el código de Profit para poder actualizar registros sin duplicarlos.
- Agregar a la bd local al modelo `Usuario` el campo `cod_profit` para guardar el registro y evitar duplicados en futuras sincronizaciones.

### 2. Clientes

Tabla fuente: `AD_DIST.DBO.CRM_CLIENTE`

Columnas observadas:

- `cod`
- `rif`
- `razon_social`
- `direccion`
- `telefonos`
- `vendedor`
- `correo`

Destino local:

- `ClienteCorporativo`
- `ClienteEmpresa`

Mapeo previsto:

| Profit | CRM local |
|---|---|
| `rif` | `ClienteCorporativo.rif` |
| `razon_social` | `ClienteCorporativo.razonSocial` |
| `direccion` | `ClienteCorporativo.direccion` |
| `telefonos` | `ClienteCorporativo.telefono` |
| `cod` | `ClienteEmpresa.profitCodCli` |
| `vendedor` | `ClienteEmpresa.vendedor` y `vendedorId` cuando exista correspondencia |

Reglas iniciales:

- Usar `rif` para identificar o actualizar el cliente corporativo.
- Usar `(empresaId, profitCodCli)` para identificar o actualizar el cliente de la empresa.
- No insertar clientes sin RIF válido o sin código de cliente.
- Reportar los registros rechazados sin detener toda la sincronización.
- No eliminar automáticamente clientes locales que ya no aparezcan en Profit.

### 3. Ventas

Tabla fuente: `AD_DIST.DBO.CRM_VENTAS`

Columnas observadas:

- `SemanaDelMes`
- `fecha`
- `num_nde`
- `unidades_vendidas`
- `precio_unidad`
- `monto_neto`
- `cod_Cliente`
- `cod_vendedor`

Destino local: `VentaCliente`

Mapeo previsto:

| Profit | CRM local |
|---|---|
| `cod_Cliente` | Cliente local mediante `empresaId + profitCodCli` |
| `num_nde` | `VentaCliente.documento` |
| `fecha` | `VentaCliente.fecha` |
| `unidades_vendidas` | `VentaCliente.unidades` |
| `monto_neto` | `VentaCliente.monto` |
| `SemanaDelMes` | `VentaCliente.semana`, sujeto a validación |
| fecha | `VentaCliente.mes`, con el formato definido por el CRM |

Reglas iniciales:

- Usar `(clienteEmpresaId, documento)` para evitar ventas duplicadas.
- No insertar ventas sin cliente local resoluble.
- No insertar ventas sin documento, fecha, unidades o monto válidos.
- Validar si `num_nde` identifica una factura completa o una línea de factura.
- Confirmar si `SemanaDelMes` debe copiarse directamente o calcularse desde `fecha`.

## Orden de ejecución

La sincronización debe ejecutarse en este orden:

1. Vendedores.
2. Clientes.
3. Ventas.

Esto garantiza que las ventas encuentren previamente a sus clientes y que los clientes puedan asociarse a sus vendedores.

## Fases de trabajo

### Fase 0: Diagnóstico sin escritura

1. Validar la configuración de conexión de la empresa `San Luis`.
2. Verificar conectividad TCP desde el servidor del backend hacia SQL Server.
3. Confirmar permisos de solo lectura del usuario Profit.
4. Consultar los nombres, tipos y valores nulos de las columnas.
5. Consultar muestras limitadas de las tres tablas.
6. Consultar cantidad de registros, fechas mínima y máxima de ventas.
7. Revisar duplicados de códigos, RIF y documentos.
8. No insertar ni modificar datos locales durante esta fase.

Criterio para continuar: conexión exitosa, columnas confirmadas y mapeo validado con datos reales.

### Fase 1: Cambios de modelo y preparación

1. Confirmar cómo guardar el código Profit del vendedor.
2. Agregar una columna o tabla auxiliar únicamente si es necesaria para la idempotencia.
3. Crear y aplicar la migración Prisma si se modifica el esquema.
4. Regenerar Prisma Client.
5. Validar el esquema y compilar el backend.

### Fase 2: Implementación del servicio

Modificar `backend/src/services/profitSync.service.ts` para:

1. Crear la conexión MSSQL con las credenciales de `Empresa`.
2. Ejecutar consultas parametrizadas.
3. Cerrar el pool MSSQL en un bloque `finally`.
4. Calcular el rango móvil de ventas:
   - `fechaInicio`: fecha actual menos 9 meses.
   - `fechaFin`: día siguiente a la fecha actual.
   - Consulta usando `fecha >= fechaInicio AND fecha < fechaFin`.
5. Implementar upserts para vendedores, clientes y ventas.
6. Ejecutar operaciones locales dentro de transacciones cuando corresponda.
7. Reportar registros insertados, actualizados, omitidos y errores por fila.
8. Evitar registrar contraseñas, credenciales o datos sensibles.

### Fase 3: Integración HTTP

Revisar `backend/src/controllers/profit.controller.ts` y las rutas de Profit para:

1. Ejecutar vendedores antes de clientes y ventas.
2. Mantener el flujo general de sincronización.
3. Agregar endpoints individuales si el frontend los necesita.
4. Alinear la respuesta del backend con el contrato utilizado por el frontend.
5. Actualizar OpenAPI si cambian rutas o respuestas.

## Pruebas

### Pruebas de conexión

- Conexión correcta al servidor remoto.
- Credenciales incompletas.
- Servidor inaccesible.
- Usuario sin permisos.
- Tabla inexistente o sin permisos de lectura.

### Pruebas de vendedores

- Insertar vendedores nuevos.
- Actualizar vendedores existentes.
- Ejecutar dos veces y comprobar que no se dupliquen.
- Validar nombres repetidos y correos generados.
- Confirmar la asociación con la empresa y rol `VENDEDOR`.

### Pruebas de clientes

- Crear cliente corporativo y cliente de empresa.
- Actualizar razón social, dirección y teléfono.
- Validar RIF duplicado.
- Validar código de cliente duplicado.
- Validar cliente sin RIF.
- Validar cliente sin vendedor.
- Ejecutar dos veces y comprobar que no se dupliquen registros.

### Pruebas de ventas

- Importar ventas dentro de los últimos 9 meses.
- Confirmar que se incluyan ventas del día actual con hora.
- Confirmar que no se importen ventas anteriores al rango.
- Validar cliente inexistente.
- Validar documento repetido.
- Validar unidades y montos decimales.
- Confirmar el cálculo de mes y semana.
- Ejecutar dos veces y comprobar que no se dupliquen ventas.

### Validación técnica

Desde el directorio `backend` ejecutar:

```bash
npm run prisma:validate
npm run build
```

Después de implementar, probar los endpoints autenticados con un usuario `MASTER` y verificar las cantidades devueltas por cada proceso.

## Archivos involucrados

Inicialmente:

- `backend/docs/PLAN-SINCRONIZACION-PROFIT.md`
- `backend/src/services/profitSync.service.ts`
- `backend/src/controllers/profit.controller.ts`
- `backend/src/routes/profit.routes.ts`

Solo si resulta necesario:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- Documentación OpenAPI.
- Servicios del frontend.

## Fuera de alcance

- Modificar tablas o datos del servidor Profit.
- Eliminar automáticamente datos locales ausentes en Profit.
- Ejecutar una sincronización masiva sin completar primero el diagnóstico.
- Guardar contraseñas remotas en logs.
- Crear usuarios sin una regla estable de identificación.

## Decisiones confirmadas

- Se crearán o actualizarán usuarios a partir de `CRM_VENDEDOR`.
- El correo se generará como `<nombre>@sanluis.com.ve`.
- La contraseña inicial será `1234`, almacenada con bcrypt.
- Las ventas usarán siempre los últimos 9 meses móviles.
- El rango de fechas tendrá inicio inclusivo y fin exclusivo.

## Decisiones pendientes antes de programar

1. Confirmar dónde guardar el código Profit del vendedor.
2. Confirmar qué hacer cuando existan dos vendedores con el mismo nombre.
3. Confirmar el huso horario del servidor Profit y del backend.
4. Confirmar si `num_nde` es único por cliente o solo por documento global.
5. Confirmar si una fila de `CRM_VENTAS` representa una factura o una línea de factura.
6. Confirmar si `SemanaDelMes` se copia directamente o se calcula desde `fecha`.
7. Confirmar el formato final del campo `mes` en `VentaCliente`.
