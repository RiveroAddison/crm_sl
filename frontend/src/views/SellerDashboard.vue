<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useDashboardStore } from '../stores/dashboard';
import { useProspectsStore } from '../stores/prospects';
import { useVisitasStore } from '../stores/visitas';
import type { EtapaOportunidad } from '../domain/prospecto';
import { cuentasComercialesApi } from '../services';
import type { CuentaComercial } from '../domain';

import SellerHeader from '../components/seller/SellerHeader.vue';
import SellerOverviewMetrics from '../components/seller/SellerOverviewMetrics.vue';
import WeeklyRoutePlanner from '../components/seller/WeeklyRoutePlanner.vue';
import SalesHistogramChart from '../components/seller/SalesHistogramChart.vue';
import ClientPortfolioList from '../components/seller/ClientPortfolioList.vue';
import ProspectModal from '../components/common/ProspectModal.vue';

const auth = useAuthStore();
const dashboard = useDashboardStore();
const prospects = useProspectsStore();
const visitas = useVisitasStore();
const loading = ref(true);
const error = ref('');
type Client = { id: string; razonSocial: string; rif: string; estado: string; vendedor: string; visitas: Array<{ semana: number; dia: string; estado: string; latitud?: number | null; longitud?: number | null }>; ventas: Array<{ mes: string; semana: number; unidades: number; monto: number }> };
const clients = computed<Client[]>(() => dashboard.clients as unknown as Client[]);
const companyName = computed(() => auth.empresa?.nombre ?? 'Empresa');
const search = ref('');
const onlyWithSales = ref(false);
const selectedDay = ref('Lunes');
const selectedWeek = ref(1);
const selectedMonth = ref('');
const checkingIn = ref<string | null>(null);
const checkInError = ref('');
const showProspectModal = ref(false);
const prospectFormError = ref('');
const cuentasComerciales = ref<CuentaComercial[]>([]);
const newProspect = ref({ razonSocial: '', rif: '', titulo: '', rubro: '', direccion: '', telefono: '', etapa: 'NUEVO' as EtapaOportunidad, valorEstimado: 0, fechaContacto: new Date().toISOString().slice(0, 10), vendedorNombre: '', cuentaComercialId: '' });
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const weeks = computed(() => [...new Set(clients.value.flatMap((client) => client.visitas.map((visit) => visit.semana)))].sort((a, b) => a - b));
// Fuente única de verdad: SIEMPRE 9 meses continuos anclados al "ahora",
// ordenados del más antiguo (índice 0, izquierda) al más reciente (índice 8).
// Se rellena con 0 los meses sin ventas para que el histograma se vea continuo.
const months = computed<string[]>(() => buildLastNineMonths());

const sales = computed<number[]>(() => months.value.map((month) => clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === month).reduce((total, sale) => total + sale.monto, 0)));
const units = computed<number[]>(() => months.value.map((month) => clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === month).reduce((total, sale) => total + sale.unidades, 0)));
const routeClients = computed(() => clients.value.filter((client) => client.visitas.some((visit) => visit.semana === selectedWeek.value && visit.dia === selectedDay.value)));

// ────────────────────────────────────────────────────────────────────────────
// Selección de cliente para el histograma individual
// ────────────────────────────────────────────────────────────────────────────
const selectedClient = ref<Client | null>(null);

/**
 * Genera los últimos 9 meses en formato YYYY-MM, ordenados del más antiguo
 * (índice 0, izquierda del histograma) al más reciente (índice 8, derecha).
 * Alineado con la ventana móvil del backend (profitSync.service.ts).
 */
function buildLastNineMonths(now: Date = new Date()): string[] {
  const result: string[] = [];
  for (let offset = 8; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
  }
  return result;
}

// Cuando hay un cliente seleccionado, trabajamos SIEMPRE sobre la ventana
// móvil de 9 meses (rellenando con 0 los meses sin ventas), para que el
// histograma se vea continuo y ordenado cronológicamente de viejo → actual.
const clientMonths = computed<string[]>(() => {
  if (!selectedClient.value) return months.value;
  return buildLastNineMonths();
});

const clientSales = computed<number[]>(() => {
  const source = selectedClient.value;
  if (!source) return sales.value;
  const targetMonths = clientMonths.value;
  return targetMonths.map((month) =>
    source.ventas
      .filter((sale) => sale.mes === month)
      .reduce((total, sale) => total + sale.monto, 0),
  );
});

const clientUnits = computed<number[]>(() => {
  const source = selectedClient.value;
  if (!source) return units.value;
  return clientMonths.value.map((month) =>
    source.ventas
      .filter((sale) => sale.mes === month)
      .reduce((total, sale) => total + sale.unidades, 0),
  );
});

const selectedMonthSales = computed(() => {
  const source = selectedClient.value;
  if (!source) {
    return clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === selectedMonth.value);
  }
  return source.ventas.filter((sale) => sale.mes === selectedMonth.value);
});
const selectedMonthTotal = computed(() => selectedMonthSales.value.reduce((total, sale) => total + sale.monto, 0));
const selectedMonthUnits = computed(() => selectedMonthSales.value.reduce((total, sale) => total + sale.unidades, 0));
const weeklyBreakdown = computed(() => [1, 2, 3, 4].map((week) => selectedMonthSales.value.filter((sale) => sale.semana === week).reduce((total, sale) => total + sale.monto, 0)));
// Predicado reutilizable: ¿el cliente tiene al menos una venta con monto > 0?
// Coincide con la ventana móvil de 9 meses que ya aplica el backend
// (profitSync.service.ts), por lo que "con ventas" implica "con actividad
// reciente".
function hasSales(client: Client): boolean {
  return client.ventas.some((sale) => sale.monto > 0);
}

const filteredClients = computed(() => {
  // 1) Filtro de búsqueda (razón social, RIF, estado, vendedor)
  const query = search.value.trim().toLowerCase();
  let result = clients.value;

  if (query) {
    // Normalizamos el RIF quitando guiones y espacios para que el vendedor
    // pueda buscar "j12345678" y encontrar "J-12345678-9" sin fricción.
    const normalize = (value: string) =>
      value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedQuery = normalize(query).replace(/[^a-z0-9]/g, '');

    result = result.filter((client) => {
      const razonSocial = normalize(client.razonSocial ?? '');
      const rifNormalized = normalize(client.rif ?? '').replace(/[^a-z0-9]/g, '');
      const estado = normalize(client.estado ?? '');
      const vendedor = normalize((client as Client).vendedor ?? '');

      return (
        razonSocial.includes(query) ||
        estado.includes(query) ||
        vendedor.includes(query) ||
        rifNormalized.includes(normalizedQuery)
      );
    });
  }

  // 2) Filtro opcional: solo clientes con ventas registradas
  if (onlyWithSales.value) {
    result = result.filter(hasSales);
  }

  return result;
});

async function checkIn(client: Client) {
  checkingIn.value = client.id;
  checkInError.value = '';
  try {
    await visitas.registrarCheckIn({
      rif: client.rif,
      clienteRazonSocial: client.razonSocial,
      semana: selectedWeek.value,
      dia: selectedDay.value,
      comentario: 'Check-in registrado desde portal vendedor',
    });
    const clientRecord = clients.value.find((c) => c.id === client.id);
    const visitRecord = clientRecord?.visitas.find((v) => v.semana === selectedWeek.value && v.dia === selectedDay.value);
    if (visitRecord) { visitRecord.estado = 'VISITADO'; }
  } catch (cause) {
    checkInError.value = cause instanceof Error ? cause.message : 'No fue posible completar el check-in';
  } finally {
    checkingIn.value = null;
  }
}

async function submitProspect() {
  prospectFormError.value = '';
  try {
    newProspect.value.vendedorNombre = auth.user?.nombre || '';
    newProspect.value.rubro = auth.empresa?.rubro || '';
    newProspect.value.titulo = `${auth.empresa?.rubro || 'Oportunidad'} - ${newProspect.value.razonSocial}`;
    await prospects.create(newProspect.value);
    showProspectModal.value = false;
    newProspect.value = { razonSocial: '', rif: '', titulo: '', rubro: '', direccion: '', telefono: '', etapa: 'NUEVO', valorEstimado: 0, fechaContacto: new Date().toISOString().slice(0, 10), vendedorNombre: '', cuentaComercialId: '' };
  } catch (cause) {
    prospectFormError.value = cause instanceof Error ? cause.message : 'No fue posible crear el prospecto';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Histograma individual por cliente
// ────────────────────────────────────────────────────────────────────────────
function selectClient(client: Client): void {
  selectedClient.value = client;
  // Seleccionamos el mes más reciente disponible del cliente (si tiene ventas),
  // o el último mes del rango móvil de 9 meses, para que el desglose semanal
  // arranque con información útil.
  const targetMonths = buildLastNineMonths();
  const lastAvailable = [...targetMonths].reverse().find((m) => client.ventas.some((s) => s.mes === m));
  selectedMonth.value = lastAvailable ?? targetMonths[targetMonths.length - 1];

  // Scroll suave hacia el histograma para mejorar la UX.
  // Se ejecuta tras el siguiente tick del DOM para asegurar que el
  // histograma ya re-renderizó con los datos del cliente.
  nextTick(() => {
    const chart = document.getElementById('sales-histogram-section');
    chart?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function clearClientSelection(): void {
  selectedClient.value = null;
  // Restauramos el mes por defecto (último mes agregado disponible).
  if (months.value.length) {
    selectedMonth.value = months.value[months.value.length - 1];
  }
}

onMounted(async () => {
  try {
    const [accounts] = await Promise.all([cuentasComercialesApi.list(), dashboard.load(true)]);
    cuentasComerciales.value = accounts;
    if (months.value.length) { selectedMonth.value = months.value[months.value.length - 1]; }
    if (weeks.value.length) { selectedWeek.value = weeks.value[0]; }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Error al cargar el dashboard';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-brand-sky pb-12">
    <SellerHeader 
      :company-name="companyName" 
      :seller-name="auth.user?.nombre" 
      @open-prospect-modal="showProspectModal = true" 
      @logout="auth.logout" 
    />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div v-if="loading" class="text-center py-12 text-slate-500">Cargando espacio comercial...</div>
      <div v-else-if="error" class="bg-red-50 text-red-700 p-4 rounded-xl text-center border border-red-200">{{ error }}</div>
      <template v-else>
        <SellerOverviewMetrics :metrics="dashboard.metrics" />

        <ClientPortfolioList
          :filtered-clients="filteredClients"
          v-model:search="search"
          v-model:only-with-sales="onlyWithSales"
          @select-client="selectClient"
        />

        <SalesHistogramChart
          id="sales-histogram-section"
          :months="clientMonths"
          :sales="clientSales"
          :units="clientUnits"
          v-model:selected-month="selectedMonth"
          :selected-month-total="selectedMonthTotal"
          :selected-month-units="selectedMonthUnits"
          :weekly-breakdown="weeklyBreakdown"
          :selected-month-sales="selectedMonthSales"
          :chart-title="selectedClient ? `Histograma de Ventas — ${selectedClient.razonSocial}` : 'Histograma de Ventas (Últimos 9 Meses)'"
          :chart-subtitle="selectedClient
            ? `Ventas mensuales de ${selectedClient.razonSocial} (${selectedClient.rif}) en los últimos 9 meses. Toca cualquier mes para ver el desglose semanal.`
            : 'Toca o haz clic en cualquier mes para desglosar el detalle de las 4 semanas.'"
          :clear-label="selectedClient ? 'Volver a vista global' : ''"
          @clear-selection="clearClientSelection"
        />

        <WeeklyRoutePlanner 
          :weeks="weeks" 
          :days="days" 
          v-model:selected-week="selectedWeek" 
          v-model:selected-day="selectedDay" 
          :route-clients="routeClients" 
          :checking-in="checkingIn" 
          :check-in-error="checkInError" 
          @check-in="checkIn" 
        />

      </template>
    </main>

    <ProspectModal 
      v-if="showProspectModal" 
      :new-prospect="newProspect" 
      :loading="prospects.loading" 
      :error="prospectFormError"
      :empresa-rubro="auth.empresa?.rubro || ''"
      :cuentas-comerciales="cuentasComerciales"
      @submit="submitProspect" 
      @close="showProspectModal = false" 
    />
  </div>
</template>
