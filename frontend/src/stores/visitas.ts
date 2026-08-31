// filepath: src/stores/visitas.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { visitasApi } from '../services';
import type { CheckInInput, VisitaGps } from '../domain';

export const useVisitasStore = defineStore('visitas', () => {
  const visitas = ref<VisitaGps[]>([]);
  const loading = ref(false);
  const error = ref('');

  const fieldVisitsCount = computed(() => visitas.value.filter((v) => v.estado === 'VISITADO').length);

  async function hydrate(): Promise<void> {
    const cached = await visitasApi.fromCache();
    if (cached.length > 0) visitas.value = cached;
  }

  async function load(force = false): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      if (force || visitas.value.length === 0) {
        visitas.value = await visitasApi.list();
      } else {
        visitasApi.list().then((fresh) => (visitas.value = fresh)).catch(() => undefined);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible cargar las visitas';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Pide la posicion del navegador y registra el check-in.
   * Si el navegador no tiene geolocalizacion o el usuario la rechaza,
   * lanza un error que la UI debera mostrar.
   */
  async function registrarCheckIn(input: Omit<CheckInInput, 'latitud' | 'longitud'>): Promise<VisitaGps> {
    error.value = '';
    const coords = await getCurrentPosition();
    const created = await visitasApi.checkIn({ ...input, latitud: coords.lat, longitud: coords.lng });
    visitas.value = [created, ...visitas.value];
    return created;
  }

  return { visitas, loading, error, fieldVisitsCount, hydrate, load, registrarCheckIn };
});

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Este dispositivo no permite obtener ubicacion'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('No fue posible obtener tu ubicacion')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}
