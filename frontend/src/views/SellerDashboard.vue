<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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
const months = computed(() => [...new Set(clients.value.flatMap((client) => client.ventas.map((sale) => sale.mes)))].sort((first, second) => new Date(`1 ${first}`).getTime() - new Date(`1 ${second}`).getTime()));
const sales = computed(() => months.value.map((month) => clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === month).reduce((total, sale) => total + sale.monto, 0)));
const routeClients = computed(() => clients.value.filter((client) => client.visitas.some((visit) => visit.semana === selectedWeek.value && visit.dia === selectedDay.value)));
const selectedMonthSales = computed(() => clients.value.flatMap((client) => client.ventas).filter((sale) => sale.mes === selectedMonth.value));
const selectedMonthTotal = computed(() => selectedMonthSales.value.reduce((total, sale) => total + sale.monto, 0));
const selectedMonthUnits = computed(() => selectedMonthSales.value.reduce((total, sale) => total + sale.unidades, 0));
const weeklyBreakdown = computed(() => [1, 2, 3, 4].map((week) => selectedMonthSales.value.filter((sale) => sale.semana === week).reduce((total, sale) => total + sale.monto, 0)));
const filteredClients = computed(() => clients.value.filter((client) => `${client.razonSocial} ${client.rif}`.toLowerCase().includes(search.value.toLowerCase())));

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
        />

        <SalesHistogramChart 
          :months="months" 
          :sales="sales" 
          v-model:selected-month="selectedMonth" 
          :selected-month-total="selectedMonthTotal" 
          :selected-month-units="selectedMonthUnits" 
          :weekly-breakdown="weeklyBreakdown" 
          :selected-month-sales="selectedMonthSales" 
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
