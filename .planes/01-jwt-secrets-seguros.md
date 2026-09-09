# Plan 01: JWT Secrets Seguros

**Prioridad:** 🔴 CRÍTICO
**Archivos afectados:** `src/lib/auth.ts`
**Riesgo:** Si `JWT_SECRET` o `JWT_REFRESH_SECRET` no están configurados, se usan secretos predecibles que un atacante puede usar para firmar tokens falsos.

---

## Diagnóstico

En `src/lib/auth.ts:16-18`:
```typescript
const jwtSecret = configuredSecret || 'default-fallback-secret-key-change-in-prod';
const jwtRefreshSecret = configuredRefreshSecret || 'default-refresh-fallback-secret-key-change-in-prod';
```

- Se emite un `console.warn` pero el servidor **continúa arrancando** con secretos débiles.
- En producción, esto permite que cualquier persona firme tokens JWT válidos.

---

## Cambios a implementar

### Archivo: `src/lib/auth.ts`

1. **Eliminar los fallbacks** y lanzar error si no están configurados en producción:
   ```typescript
   if (!configuredSecret) {
     if (process.env.NODE_ENV === 'production') {
       throw new Error('[SECURITY] JWT_SECRET es requerido en producción. Configure la variable de entorno.');
     }
     console.warn('[SECURITY WARNING] JWT_SECRET no configurado. Usando solo para desarrollo.');
   }
   ```

2. **Hacer lo mismo para `JWT_REFRESH_SECRET`**

3. **Mantener los defaults solo para development** con advertencia clara

---

## Verificación

1. Arrancar sin `JWT_SECRET` en `.env` → debe lanzar error en producción
2. Arrancar sin `JWT_SECRET` en `.env` con `NODE_ENV=development` → debe funcionar con warning
3. Arrancar con `JWT_SECRET` configurado → debe funcionar sin warnings

---

## Archivos modificados

- [ ] `src/lib/auth.ts`
