# Arquitectura y Reglas del Negocio (Grupo San Luis)

## Modelo de Autenticación y Contexto Multi-Empresa
1. **Login Global:** El usuario autentica sus credenciales globales.
2. **Selección de Empresa:** El usuario selecciona la empresa a la que desea ingresar (según sus permisos).
3. **Context Token:** Se emite un JWT que incluye `user_id` y `empresa_id`.
4. **Tenant Isolation:** Todas las operaciones de pipeline, oportunidades y cotizaciones se filtran explícitamente por el `empresa_id` activo.

## Fuentes de Datos (System of Record vs CRM)
- **Profit (SQL Server):** Es la fuente central de verdad para clientes activos facturados, transacciones y catálogos de cada empresa.
- **CRM (SQLite):** Capa liviana para orquestación de autenticación, usuarios, pipelines comerciales y el maestro corporativo.

## Detección de Clientes Cruzados (Cross-Selling)
- **Identificador Maestro:** Se utiliza el RIF / ID Fiscal único como la clave única del grupo.
- **Sincronización / Lectura Profit:** Al consultar un cliente en el CRM, el backend cruzará su RIF contra los registros de las distintas BDs de Profit para determinar la matriz de consumo (Combustible, Lubricantes, Autopartes, Transporte, Alimentos Balanceados, Alimentos Congelados).

## Organizacion de Carpetas
- **Arquitectura de capas** Se usa para mantener el codigo escalable y lejible.
- **Principios solid** Para darle escabilidad al software.