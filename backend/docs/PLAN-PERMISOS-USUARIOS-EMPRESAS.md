# Plan de permisos de usuarios por empresa

## Objetivo

Permitir que al crear o editar un usuario se seleccionen únicamente las empresas que puede ver y utilizar. Las empresas no seleccionadas tendrán el estado **No aplica** y no se guardará ninguna relación de acceso para ellas.

## Reglas funcionales

- **No aplica** será un estado visual del formulario, no un rol persistido.
- Cada empresa seleccionada conservará su propio rol:
  - `MASTER`
  - `ADMIN`
  - `VENDEDOR`
- Un usuario podrá tener varias empresas si corresponde al rol `MASTER`.
- `ADMIN` y `VENDEDOR` mantendrán la regla actual de una sola empresa.
- Un usuario sin empresas podrá guardarse, pero no podrá iniciar sesión hasta tener una empresa activa asignada.
- `MASTER` tendrá alcance global.
- `ADMIN` solo podrá gestionar usuarios y empresas dentro de las empresas asignadas a su propia cuenta.

## Cambios previstos

### Frontend

Actualizar `frontend/src/views/AdminDashboard.vue` para:

- No asignar `VENDEDOR` automáticamente a todas las empresas.
- Mostrar `No aplica` como opción para cada empresa.
- Reconstruir el formulario a partir de las relaciones reales del usuario.
- Eliminar del payload las empresas marcadas como `No aplica`.
- Mantener la selección de rol independiente para cada empresa.
- Validar la cantidad de empresas según el rol.

Revisar los tipos en:

- `frontend/src/domain/usuario.ts`
- `frontend/src/domain/api.ts`

`No aplica` no debe agregarse como valor válido del rol enviado a la API.

### Backend

Actualizar `backend/src/controllers/usuarios.controller.ts` para:

- Permitir `empresas: []`.
- Validar que las empresas existan y estén activas.
- Rechazar empresas repetidas.
- Crear relaciones `UsuarioEmpresa` únicamente para las empresas seleccionadas.
- Eliminar relaciones cuando una empresa pase a `No aplica`.
- Evitar que una edición agregue automáticamente empresas no seleccionadas.
- Validar que `ADMIN` y `VENDEDOR` no tengan más de una empresa.
- Permitir varias empresas para `MASTER`.

Actualizar el control de alcance en:

- `backend/src/controllers/usuarios.controller.ts`
- `backend/src/controllers/empresas.controller.ts`

Reglas de alcance:

- `MASTER` puede consultar y modificar todas las empresas.
- `ADMIN` solo puede consultar y modificar empresas asignadas a él mediante una relación activa.
- Un `ADMIN` no puede asignar usuarios a empresas fuera de su propio alcance.
- `VENDEDOR` no puede acceder a la administración.

### Autenticación

Actualizar `backend/src/controllers/auth.controller.ts` para conservar el bloqueo de usuarios sin empresas activas, utilizando un mensaje claro que indique que no tienen empresas habilitadas.

No se creará un token sin `tenantId`, porque las operaciones del CRM requieren una empresa activa.

### Sincronización Profit

Revisar `backend/src/services/profitSync.service.ts` para asegurar que la sincronización pueda seguir creando o actualizando relaciones de vendedores sin romper la selección manual de empresas.

## Base de datos

No se requiere una migración Prisma inicialmente. El modelo existente `UsuarioEmpresa` ya permite representar las empresas visibles para cada usuario mediante sus relaciones activas.

## Validaciones

1. Crear un usuario con todas las empresas en `No aplica`.
2. Confirmar que el usuario se crea sin relaciones `UsuarioEmpresa`.
3. Confirmar que un usuario sin empresas no puede iniciar sesión.
4. Crear un usuario con solo una empresa seleccionada.
5. Crear un usuario con varias empresas y rol `MASTER`.
6. Confirmar que un usuario `ADMIN` o `VENDEDOR` no puede tener dos empresas.
7. Editar un usuario y comprobar que las empresas marcadas como `No aplica` se eliminan.
8. Confirmar que las empresas no seleccionadas no reaparecen como `VENDEDOR`.
9. Confirmar que el selector de empresa del login solo muestra empresas asignadas y activas.
10. Confirmar que `ADMIN` no puede administrar empresas fuera de su alcance.
11. Confirmar que `MASTER` conserva acceso global.
12. Verificar que la sincronización Profit mantiene sus relaciones esperadas.
13. Ejecutar el build y las pruebas existentes de frontend, backend y autenticación.
