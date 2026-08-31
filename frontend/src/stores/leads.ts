// filepath: src/stores/leads.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { leadsApi } from '../services';
import type { Lead, LeadInput, LeadPatch, LeadCalificacion } from '../domain';

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref<Lead[]>([]);
  const loading = ref(false);
  const error = ref('');

  const activeLeads = computed(() => leads.value.filter((l) => l.estadoCalificacion !== 'DESCARTADO'));

  async function hydrate(): Promise<void> {
    const cached = await leadsApi.fromCache();
    if (cached.length > 0) leads.value = cached;
  }

  async function load(force = false): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      if (force || leads.value.length === 0) {
        leads.value = await leadsApi.list();
      } else {
        leadsApi.list().then((fresh) => (leads.value = fresh)).catch(() => undefined);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible cargar los leads';
    } finally {
      loading.value = false;
    }
  }

  async function create(input: LeadInput): Promise<Lead> {
    error.value = '';
    const lead = await leadsApi.create(input);
    leads.value = [lead, ...leads.value];
    return lead;
  }

  async function update(id: string, input: LeadPatch): Promise<Lead> {
    const updated = await leadsApi.update(id, input);
    const idx = leads.value.findIndex((l) => l.id === id);
    if (idx !== -1) leads.value[idx] = updated;
    return updated;
  }

  async function setCalificacion(lead: Lead, estadoCalificacion: LeadCalificacion): Promise<void> {
    await update(lead.id, { estadoCalificacion });
  }

  async function remove(id: string): Promise<void> {
    await leadsApi.remove(id);
    leads.value = leads.value.filter((l) => l.id !== id);
  }

  async function convert(id: string) {
    return leadsApi.convert(id);
  }

  return { leads, loading, error, activeLeads, hydrate, load, create, update, setCalificacion, remove, convert };
});
