Ahora tengo el panorama completo y claro. Voy a presentar el plan.

---

## 📋 Plan de implementación

### Análisis del estado actual

**Vista del vendedor** (`frontend/src/views/SellerDashboard.vue`):
- ✅ El filtro de búsqueda **funciona técnicamente** pero tiene una **falla importante** que voy a corregir: en la línea 46, la búsqueda usa `.includes(search.value.toLowerCase())`, lo cual es correcto, pero **no normaliza el RIF**: si el usuario busca `"j12345678"` (sin guiones), no encontrará `"J-12345678-9"`. Esta es una mejora clave.
- ❌ **No hay paginación** en la lista de cartera de clientes (`ClientPortfolioList`). Con 2153 clientes sincronizados desde Profit (según el doc), renderizar todos a la vez es problemático en performance.

**Componente afectado** (`frontend/src/components/seller/ClientPortfolioList.vue`):
- Renderiza todos los `filteredClients` en una sola lista plana sin paginación.

### Cambios a realizar

#### 1. `ClientPortfolioList.vue` (refactor principal)
- **Agregar paginación de 5 clientes por página** con:
  - Estado local `currentPage` (ref)
  - Watcher que resetee la página a 1 cuando cambie la búsqueda
  - `pageSize` constante = 5
  - Computed `totalPages`, `paginatedClients`
  - UI de paginación con botones: ‹ Anterior | 1 2 3 ... N | Siguiente › + indicador "Mostrando X-Y de Z"
- **Mejorar el filtro de búsqueda**:
  - Normalizar el RIF: quitar guiones, espacios y aplicar `toLowerCase()` antes de comparar (así "j123" encontrará "J-12345678-9").
  - Buscar también en campos adicionales útiles como `vendedor` y `estado` (mejor experiencia de búsqueda).
- Manejar el caso `filteredClients.length === 0` con un mensaje claro "No se encontraron clientes con '<query>'".

#### 2. `SellerDashboard.vue` (cambio menor)
- Mantener `filteredClients` y `search` como están (sigue siendo la fuente de verdad), ya que el componente hijo se encargará de paginar sobre ese resultado. Esto evita acoplamiento extra y mantiene la separación de responsabilidades.
- (Opcional) Agregar un `watch` que resetee la página si fuera necesario, **pero esto se manejará dentro del componente hijo** porque ahí vive el estado de paginación.

### Buenas prácticas de un Senior Frontend que aplicaré
- **Reactividad correcta**: `currentPage` se reinicia a 1 cuando cambia la búsqueda (`watch(search, ...)`).
- **Rendimiento**: solo se pagina sobre el array ya filtrado, sin re-filtrar en cada cambio de página.
- **Accesibilidad**: botones con `aria-label`, `disabled` cuando no haya páginas anterior/siguiente.
- **UX**: indicador claro "Mostrando 6-10 de 23 clientes", página actual resaltada, elipsis cuando hay muchas páginas.
- **Tipos**: mantener el tipado fuerte, no usar `any`.
- **Sin romper la API pública del componente**: el contrato con el padre (`filteredClients`, `search`) no cambia.

---

¿Apruebas el plan? Si estás de acuerdo, **cambia a modo Act** y procedo con la implementación completa del código + verificación.