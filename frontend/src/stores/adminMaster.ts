// filepath: src/stores/adminMaster.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { empresasApi, profitApi, usuariosApi } from '../services';
import type {
  Empresa,
  EmpresaInput,
  ProfitStatus,
  TestConexionInput,
  Usuario,
  UsuarioInput,
  UsuarioUpdateInput,
} from '../domain';

export const useAdminMasterStore = defineStore('adminMaster', () => {
  const usuarios = ref<Usuario[]>([]);
  const empresas = ref<Empresa[]>([]);
  const profitStatuses = ref<ProfitStatus[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const syncResults = ref<unknown>(null);

  async function loadData(force = false): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      if (force || usuarios.value.length === 0 || empresas.value.length === 0) {
        const [u, e] = await Promise.all([usuariosApi.list(), empresasApi.list()]);
        usuarios.value = u;
        empresas.value = e;
      } else {
        Promise.all([usuariosApi.list(), empresasApi.list()])
          .then(([u, e]) => {
            usuarios.value = u;
            empresas.value = e;
          })
          .catch(() => undefined);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Error al cargar datos administrativos';
    } finally {
      loading.value = false;
    }
  }

  // --- Usuarios ---
  async function createUsuario(input: UsuarioInput) {
    const created = await usuariosApi.create(input);
    await loadData(true);
    return created;
  }
  async function updateUsuario(id: string, input: UsuarioUpdateInput) {
    const updated = await usuariosApi.update(id, input);
    const idx = usuarios.value.findIndex((u) => u.id === id);
    if (idx !== -1) usuarios.value[idx] = updated;
    return updated;
  }
  async function deleteUsuario(id: string) {
    await usuariosApi.remove(id);
    usuarios.value = usuarios.value.filter((u) => u.id !== id);
  }

  // --- Empresas ---
  async function createEmpresa(input: EmpresaInput) {
    const created = await empresasApi.create(input);
    await loadData(true);
    return created;
  }
  async function updateEmpresa(id: string, input: EmpresaInput) {
    const updated = await empresasApi.update(id, input);
    const idx = empresas.value.findIndex((e) => e.id === id);
    if (idx !== -1) empresas.value[idx] = updated;
    return updated;
  }
  async function deleteEmpresa(id: string) {
    await empresasApi.remove(id);
    await loadData(true);
  }
  async function testConnection(input: TestConexionInput) {
    return empresasApi.testConnection(input);
  }

  // --- Profit ---
  async function loadProfitStatus() {
    profitStatuses.value = await profitApi.status();
  }
  async function syncClientes(empresaId?: string) {
    const res = await profitApi.syncClientes(empresaId ? { empresaId } : {});
    syncResults.value = { type: 'clientes', data: res };
    await loadProfitStatus();
    return res;
  }
  async function syncVentas(empresaId?: string) {
    const res = await profitApi.syncVentas(empresaId ? { empresaId } : {});
    syncResults.value = { type: 'ventas', data: res };
    await loadProfitStatus();
    return res;
  }
  async function syncAll(empresaId?: string) {
    const res = await profitApi.syncAll(empresaId ? { empresaId } : {});
    syncResults.value = { type: 'all', data: res };
    await loadProfitStatus();
    return res;
  }

  return {
    usuarios,
    empresas,
    profitStatuses,
    loading,
    error,
    syncResults,
    loadData,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
    testConnection,
    loadProfitStatus,
    syncClientes,
    syncVentas,
    syncAll,
  };
});
