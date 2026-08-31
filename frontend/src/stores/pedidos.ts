// filepath: src/stores/pedidos.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { pedidosApi } from '../services';
import type { CreatePedidoInput, Pedido, PedidoEstado } from '../domain';

export const usePedidosStore = defineStore('pedidos', () => {
  const pedidos = ref<Pedido[]>([]);
  const loading = ref(false);
  const error = ref('');

  const activePedidos = computed(() => pedidos.value.filter((p) => p.estado !== 'ANULADO'));
  const totalVentas = computed(() =>
    pedidos.value
      .filter((p) => p.estado === 'APROBADO' || p.estado === 'FACTURADO')
      .reduce((sum, p) => sum + p.montoTotal, 0),
  );

  async function hydrate(): Promise<void> {
    const cached = await pedidosApi.fromCache();
    if (cached.length > 0) pedidos.value = cached;
  }

  async function load(force = false): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      if (force || pedidos.value.length === 0) {
        pedidos.value = await pedidosApi.list();
      } else {
        pedidosApi.list().then((fresh) => (pedidos.value = fresh)).catch(() => undefined);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible cargar los pedidos';
    } finally {
      loading.value = false;
    }
  }

  async function create(input: CreatePedidoInput): Promise<Pedido> {
    error.value = '';
    const pedido = await pedidosApi.create(input);
    pedidos.value = [pedido, ...pedidos.value];
    return pedido;
  }

  async function updateStatus(id: string, estado: PedidoEstado): Promise<Pedido> {
    const updated = await pedidosApi.updateStatus(id, estado);
    const idx = pedidos.value.findIndex((p) => p.id === id);
    if (idx !== -1) pedidos.value[idx] = updated;
    return updated;
  }

  return { pedidos, loading, error, activePedidos, totalVentas, hydrate, load, create, updateStatus };
});
