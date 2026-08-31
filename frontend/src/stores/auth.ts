// filepath: src/stores/auth.ts
// Store de autenticacion. Las cookies httpOnly son la fuente de verdad;
// el store solo expone estado y metodos de UI.

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi, cache, onSessionExpired } from '../services';
import type { EmpresaAuth, Rol, UsuarioAuth } from '../domain';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UsuarioAuth | null>(null);
  const empresas = ref<EmpresaAuth[]>([]);
  const empresa = ref<EmpresaAuth | null>(null);
  const tenantId = ref<string | null>(null);
  const rol = ref<Rol | null>(null);
  /** preAuthToken devuelto por /login; necesario para /context. */
  const preAuthToken = ref<string | null>(null);
  const isHydrated = ref(false);
  const isInitializing = ref(true);
  const error = ref('');

  // Cuando el cliente axios agota el refresh, limpiamos el estado local.
  onSessionExpired(() => {
    void clearLocalSession();
  });

  async function clearLocalSession(): Promise<void> {
    user.value = null;
    empresas.value = [];
    empresa.value = null;
    tenantId.value = null;
    rol.value = null;
    preAuthToken.value = null;
    isHydrated.value = false;
    await cache.clearAll();
  }

  async function hydrate(): Promise<void> {
    isInitializing.value = true;
    try {
      const me = await authApi.me();
      if (me) {
        user.value = me.user;
        empresa.value = me.empresa;
        tenantId.value = me.tenantId;
        rol.value = me.rol;
        isHydrated.value = true;
      } else {
        await clearLocalSession();
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible validar la sesion';
      await clearLocalSession();
    } finally {
      isInitializing.value = false;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    error.value = '';
    try {
      const res = await authApi.login({ email, password });
      user.value = res.data.user;
      empresas.value = res.data.empresasAsignadas;
      preAuthToken.value = res.data.preAuthToken;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error de autenticacion';
      throw cause;
    }
  }

  async function selectEmpresa(empresaId: string): Promise<void> {
    if (!preAuthToken.value) {
      const message = 'La sesion de seleccion expiro; vuelve a iniciar sesion';
      error.value = message;
      throw new Error(message);
    }
    error.value = '';
    try {
      const res = await authApi.selectEmpresa({ empresaId }, preAuthToken.value);
      empresa.value = res.data.empresa;
      tenantId.value = res.data.tenantId;
      rol.value = res.data.rol;
      preAuthToken.value = null;
      isHydrated.value = true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible seleccionar la empresa';
      throw cause;
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Ignorar errores de red al cerrar sesion.
    } finally {
      await clearLocalSession();
    }
  }

  return {
    user,
    empresas,
    empresa,
    tenantId,
    rol,
    preAuthToken,
    isHydrated,
    isInitializing,
    error,
    hydrate,
    login,
    selectEmpresa,
    logout,
    clearLocalSession,
  };
});
