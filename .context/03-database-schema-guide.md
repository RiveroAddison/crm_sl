# Guía del Modelo de Datos (Prisma)

## Entidades Núcleo
- **Usuario:** Credenciales, email, password y estado del usuario.
- **Empresa:** Catálogo de empresas del grupo y credenciales de conexión a su BD Profit correspondiente.
- **UsuarioEmpresa:** Tabla pivote para permisos y roles de acceso por usuario y empresa.
- **ClienteCorporativo:** Datos fiscales unificados del grupo (`rif` único, `razonSocial`, dirección, teléfono, matriz)
- **ClienteEmpresa:** Datos del cliente específicos para una unidad de negocio (`profitCodCli`, vendedor, estado)
- **CrossSellingMatriz:** Estado consolidado del cliente por cada unidad de negocio (`COMPRA`, `NO_COMPRA`, `NA`)

## Reglas de Esquema e Índices (Prisma)
- Utilizar `@unique` en el campo `rif` de `ClienteCorporativo`.
- Definir un índice compuesto único `@@unique([empresaId, profitCodCli])` en `ClienteEmpresa`.
- Incluir `@@index([empresaId])` en todas las tablas filtradas por unidad de negocio para optimizar el aislamiento multitenant.
- Usar UUIDs o IDs auto-incrementables estandarizados en todas las llaves primarias.