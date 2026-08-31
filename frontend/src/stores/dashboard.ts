// filepath: src/stores/dashboard.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { dashboardApi } from '../services';
import type { DashboardClient, DashboardData, DashboardMetrics } from '../domain';

export const useDashboardStore = defineStore('dashboard', () => {
  const metrics = ref<DashboardMetrics>({ clientes: 0, clientesActivos: 0, crossSelling: 0 });
  const clients = ref<DashboardClient[]>([]);
  const loading = ref(false);
  const error = ref('');

  const clientsCount = computed(() => metrics.value.clientes);
  const activeClientsCount = computed(() => metrics.value.clientesActivos);
  const crossSellingCount = computed(() => metrics.value.crossSelling);

  async function hydrate(): Promise<void> {
    const cached = await dashboardApi.fromCache();
    if (cached) apply(cached);
  }

  async function load(force = false): Promise<DashboardData | null> {
    if (loading.value) return null;
    loading.value = true;
    error.value = '';
    try {
      if (force || clients.value.length === 0) {
        const data = await dashboardApi.load();
        apply(data);
        return data;
      }
      // Refresh silencioso (no bloqueante para la UI)
      dashboardApi.load().then(apply).catch(() => undefined);
      return null;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible cargar el dashboard';
      return null;
    } finally {
      loading.value = false;
    }
  }

  function apply(data: DashboardData): void {
    metrics.value = data.metrics;
    clients.value = data.clients;
  }

  return {
    metrics,
    clients,
    loading,
    error,
    clientsCount,
    activeClientsCount,
    crossSellingCount,
    hydrate,
    load,
  };
});
