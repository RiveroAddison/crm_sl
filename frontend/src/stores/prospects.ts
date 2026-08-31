// filepath: src/stores/prospects.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { prospectosApi } from '../services';
import type { CrearOportunidadForm, EtapaOportunidad, Oportunidad } from '../domain';

export const useProspectsStore = defineStore('prospects', () => {
  const prospectos = ref<Oportunidad[]>([]);
  const loading = ref(false);
  const error = ref('');

  const stages: { label: string; etapa: EtapaOportunidad; color: string }[] = [
    { label: 'Nuevo', etapa: 'NUEVO', color: '#0d91d0' },
    { label: 'En Negociacion', etapa: 'NEGOCIACION', color: '#e28743' },
    { label: 'Convertido a Cliente', etapa: 'CONVERTIDO', color: '#2ed6a4' },
    { label: 'Rechazado', etapa: 'RECHAZADO', color: '#e74c3c' },
  ];

  async function hydrate(): Promise<void> {
    const cached = await prospectosApi.fromCache();
    if (cached.length > 0) prospectos.value = cached;
  }

  async function load(force = false): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      if (force || prospectos.value.length === 0) {
        prospectos.value = await prospectosApi.list();
      } else {
        prospectosApi.list().then((fresh) => (prospectos.value = fresh)).catch(() => undefined);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible cargar los prospectos';
    } finally {
      loading.value = false;
    }
  }

  async function create(form: CrearOportunidadForm): Promise<Oportunidad> {
    error.value = '';
    const created = await prospectosApi.create(form);
    prospectos.value = [created, ...prospectos.value];
    return created;
  }

  /** Actualizacion optimista con rollback. */
  async function updateStage(id: string, etapa: EtapaOportunidad): Promise<void> {
    const target = prospectos.value.find((p) => p.id === id);
    if (!target) return;
    const old = target.etapa;
    target.etapa = etapa;
    try {
      const fresh = await prospectosApi.updateStage(id, etapa);
      const idx = prospectos.value.findIndex((p) => p.id === id);
      if (idx !== -1) prospectos.value[idx] = fresh;
    } catch (cause) {
      target.etapa = old;
      error.value = cause instanceof Error ? cause.message : 'Error al actualizar etapa';
    }
  }

  async function remove(id: string): Promise<void> {
    const idx = prospectos.value.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [removed] = prospectos.value.splice(idx, 1);
    try {
      await prospectosApi.remove(id);
    } catch (cause) {
      prospectos.value.splice(idx, 0, removed);
      error.value = cause instanceof Error ? cause.message : 'No fue posible eliminar el prospecto';
    }
  }

  /** Derivados. */
  const pipelineValue = computed(() =>
    prospectos.value
      .filter((p) => p.etapa !== 'RECHAZADO')
      .reduce((sum, p) => sum + p.valorEstimado, 0),
  );
  const activeCount = computed(
    () => prospectos.value.filter((p) => p.etapa === 'NUEVO' || p.etapa === 'NEGOCIACION').length,
  );
  const conversionRate = computed(() => {
    const total = prospectos.value.length;
    if (total === 0) return 0;
    const converted = prospectos.value.filter((p) => p.etapa === 'CONVERTIDO').length;
    return Math.round((converted / total) * 1000) / 10;
  });

  return {
    prospectos,
    loading,
    error,
    stages,
    pipelineValue,
    activeCount,
    conversionRate,
    hydrate,
    load,
    create,
    updateStage,
    remove,
  };
});
