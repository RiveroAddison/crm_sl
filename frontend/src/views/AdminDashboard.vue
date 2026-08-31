<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as L from 'leaflet';
import { useAuthStore } from '../stores/auth';
import { useProspectsStore } from '../stores/prospects';
import { useLeadsStore } from '../stores/leads';
import { usePedidosStore } from '../stores/pedidos';
import { useAdminMasterStore } from '../stores/adminMaster';
import { useVisitasStore } from '../stores/visitas';
import type { EtapaOportunidad, VisitaGps, Rol } from '../domain';

const auth = useAuthStore();
const activeView = ref<'kanban' | 'table' | 'map' | 'leads' | 'pedidos' | 'usuarios' | 'empresas' | 'profit-sync'>('kanban');
const prospects = useProspectsStore();
const leads = useLeadsStore();
const pedidos = usePedidosStore();
const adminMaster = useAdminMasterStore();
const visitas = useVisitasStore();

const showModal = ref(false);
const showLeadModal = ref(false);
const showUserModal = ref(false);
const showEmpresaModal = ref(false);

const editingUserId = ref<string | null>(null);
const userForm = ref({
  nombre: '',
  email: '',
  password: '',
  activo: true,
  empresas: [] as Array<{ empresaId: string; rol: Rol }>
});

const editingEmpresaId = ref<string | null>(null);
const empresaForm = ref({
  nombre: '',
  profitDbHost: 'localhost',
  profitDbName: '',
  profitDbUser: 'sa',
  profitDbPassword: '',
  activo: true
});

const testConnResult = ref<{ connected: boolean; message: string } | null>(null);
const testConnLoading = ref(false);
const syncEmpresaId = ref<string>('');
const syncRunning = ref(false);

function openCreateUserModal() {
  editingUserId.value = null;
  userForm.value = {
    nombre: '',
    email: '',
    password: '',
    activo: true,
    empresas: adminMaster.empresas.map(e => ({ empresaId: e.id, rol: 'VENDEDOR' }))
  };
  showUserModal.value = true;
}

function openEditUserModal(u: any) {
  editingUserId.value = u.id;
  userForm.value = {
    nombre: u.nombre,
    email: u.email,
    password: '',
    activo: u.activo,
    empresas: adminMaster.empresas.map(e => {
      const found = u.empresas?.find((ue: any) => ue.empresaId === e.id);
      return {
        empresaId: e.id,
        rol: found ? found.rol : 'VENDEDOR'
      };
    })
  };
  showUserModal.value = true;
}

async function submitUserForm() {
  try {
    if (editingUserId.value) {
      await adminMaster.updateUsuario(editingUserId.value, userForm.value);
    } else {
      await adminMaster.createUsuario(userForm.value);
    }
    showUserModal.value = false;
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error al guardar usuario');
  }
}

async function removeUsuario(id: string) {
  if (confirm('¿Está seguro de eliminar o desactivar este usuario?')) {
    try {
      await adminMaster.deleteUsuario(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  }
}

function openCreateEmpresaModal() {
  editingEmpresaId.value = null;
  empresaForm.value = {
    nombre: '',
    profitDbHost: 'localhost',
    profitDbName: '',
    profitDbUser: 'sa',
    profitDbPassword: '',
    activo: true
  };
  testConnResult.value = null;
  showEmpresaModal.value = true;
}

function openEditEmpresaModal(e: any) {
  editingEmpresaId.value = e.id;
  empresaForm.value = {
    nombre: e.nombre,
    profitDbHost: e.profitDbHost || 'localhost',
    profitDbName: e.profitDbName || '',
    profitDbUser: e.profitDbUser || 'sa',
    profitDbPassword: e.profitDbPassword || '',
    activo: e.activo
  };
  testConnResult.value = null;
  showEmpresaModal.value = true;
}

async function submitEmpresaForm() {
  try {
    if (editingEmpresaId.value) {
      await adminMaster.updateEmpresa(editingEmpresaId.value, empresaForm.value);
    } else {
      await adminMaster.createEmpresa(empresaForm.value);
    }
    showEmpresaModal.value = false;
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error al guardar empresa');
  }
}

async function removeEmpresa(id: string) {
  if (confirm('¿Está seguro de eliminar o desactivar esta empresa?')) {
    try {
      await adminMaster.deleteEmpresa(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar empresa');
    }
  }
}

async function testCurrentEmpresaConnection() {
  testConnLoading.value = true;
  testConnResult.value = null;
  try {
    const res = await adminMaster.testConnection({
      host: empresaForm.value.profitDbHost,
      name: empresaForm.value.profitDbName,
      user: empresaForm.value.profitDbUser,
      password: empresaForm.value.profitDbPassword
    });
    testConnResult.value = res;
  } catch (err) {
    testConnResult.value = { connected: false, message: err instanceof Error ? err.message : 'Error de conexión' };
  } finally {
    testConnLoading.value = false;
  }
}

async function runSyncClientes() {
  syncRunning.value = true;
  try {
    await adminMaster.syncClientes(syncEmpresaId.value || undefined);
    alert('¡Sincronización de clientes con Profit completada con éxito!');
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error al sincronizar clientes');
  } finally {
    syncRunning.value = false;
  }
}

async function runSyncVentas() {
  syncRunning.value = true;
  try {
    await adminMaster.syncVentas(syncEmpresaId.value || undefined);
    alert('¡Sincronización de ventas con Profit completada con éxito!');
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error al sincronizar ventas');
  } finally {
    syncRunning.value = false;
  }
}

async function runSyncAll() {
  syncRunning.value = true;
  try {
    await adminMaster.syncAll(syncEmpresaId.value || undefined);
    alert('¡Sincronización general (Clientes y Ventas) ejecutada exitosamente!');
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error al sincronizar');
  } finally {
    syncRunning.value = false;
  }
}

const visits = ref<VisitaGps[]>([]);
const mapElement = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;

// --- filtros locales del kanban/tabla (la store ya no los expone) ---
const searchQuery = ref('');
const selectedSeller = ref('Todos los Vendedores');
const selectedStatus = ref('Todos los Estados');
const sellers = computed(() => {
  const set = new Set(prospects.prospectos.map((p) => p.vendedorNombre));
  return ['Todos los Vendedores', ...Array.from(set)];
});
const filteredProspectos = computed(() =>
  prospects.prospectos.filter((p) => {
    const matchSearch = `${p.razonSocial} ${p.rif} ${p.titulo}`.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchSeller = selectedSeller.value === 'Todos los Vendedores' || p.vendedorNombre === selectedSeller.value;
    const matchStatus = selectedStatus.value === 'Todos los Estados' || p.etapa === selectedStatus.value;
    return matchSearch && matchSeller && matchStatus;
  }),
);

const statuses: Array<{ label: string; value: EtapaOportunidad; color: string; badgeBg: string; border: string }> = [
  { label: 'Nuevo', value: 'NUEVO', color: 'text-blue-700', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-500' },
  { label: 'En Negociación', value: 'NEGOCIACION', color: 'text-amber-700', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-500' },
  { label: 'Convertido a Cliente', value: 'CONVERTIDO', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-500' },
  { label: 'Rechazado', value: 'RECHAZADO', color: 'text-rose-700', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200', border: 'border-rose-500' }
];

const newProspect = ref({
  razonSocial: '',
  rif: '',
  titulo: '',
  etapa: 'NUEVO' as EtapaOportunidad,
  valorEstimado: 0,
  fechaContacto: new Date().toISOString().slice(0, 10),
  vendedorNombre: ''
});
const formError = ref('');
const draggingId = ref<string | null>(null);
const visitsLoading = ref(false);
const leadFormError = ref('');
const newLead = ref({
  nombreContacto: '',
  empresaNombre: '',
  rif: '',
  email: '',
  telefono: '',
  fuente: 'REFERIDO' as const,
  presupuesto: 0,
  necesidad: '',
  autoridad: '',
  tiempo: ''
});

const fieldVisits = computed(() =>
  visits.value.filter((visit) => visit.estado === 'VISITADO' && visit.latitud != null && visit.longitud != null).length
);

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-VE')}`;
}

function getColumnTotal(etapa: EtapaOportunidad) {
  return prospects.prospectos
    .filter((p) => p.etapa === etapa)
    .reduce((sum, p) => sum + p.valorEstimado, 0);
}

function resetProspectForm() {
  newProspect.value = {
    razonSocial: '',
    rif: '',
    titulo: '',
    etapa: 'NUEVO',
    valorEstimado: 0,
    fechaContacto: new Date().toISOString().slice(0, 10),
    vendedorNombre: auth.user?.nombre || ''
  };
  formError.value = '';
}

async function submitProspect() {
  formError.value = '';
  try {
    await prospects.create(newProspect.value);
    showModal.value = false;
    resetProspectForm();
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'No fue posible crear el prospecto';
  }
}

function resetLeadForm() {
  newLead.value = {
    nombreContacto: '',
    empresaNombre: '',
    rif: '',
    email: '',
    telefono: '',
    fuente: 'REFERIDO',
    presupuesto: 0,
    necesidad: '',
    autoridad: '',
    tiempo: ''
  };
  leadFormError.value = '';
}

async function submitLead() {
  leadFormError.value = '';
  try {
    await leads.create(newLead.value);
    showLeadModal.value = false;
    resetLeadForm();
  } catch (cause) {
    leadFormError.value = cause instanceof Error ? cause.message : 'No fue posible crear el lead';
  }
}

async function promoteLead(id: string) {
  try {
    await leads.convert(id);
    await prospects.load(true);
    await leads.load(true);
  } catch (cause) {
    leads.error = cause instanceof Error ? cause.message : 'No fue posible promover el lead';
  }
}

async function loadVisits() {
  visitsLoading.value = true;
  try {
    await visitas.load(true);
    visits.value = visitas.visitas;
  } finally {
    visitsLoading.value = false;
  }
}

async function renderMap() {
  await nextTick();
  if (!mapElement.value) return;
  if (!map) {
    map = L.map(mapElement.value).setView([10.06, -69.35], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }
  markerLayer?.clearLayers();
  visits.value
    .filter((visit) => visit.latitud != null && visit.longitud != null)
    .forEach((visit) => {
      const popupHtml = `
        <div class="p-1 text-slate-800">
          <div class="font-bold text-sm text-[#073b73]">${visit.clienteRazonSocial}</div>
          <div class="text-xs text-slate-500 font-mono">${visit.rif}</div>
          <div class="text-xs mt-1"><strong>Vendedor:</strong> ${visit.vendedorNombre}</div>
          <div class="text-xs mt-0.5 text-slate-600">${visit.comentario || 'Sin observaciones'}</div>
          <div class="text-[11px] text-slate-400 mt-1">${visit.fechaHora}</div>
        </div>
      `;
      L.marker([visit.latitud as number, visit.longitud as number])
        .bindPopup(popupHtml)
        .addTo(markerLayer!);
    });
  map.invalidateSize();
}

function clearFilters() {
  prospects.searchQuery = '';
  prospects.selectedSeller = 'Todos los Vendedores';
  prospects.selectedStatus = 'Todos los Estados';
}

function dropProspect(etapa: EtapaOportunidad) {
  if (draggingId.value) {
    void prospects.updateStage(draggingId.value, etapa);
  }
  draggingId.value = null;
}

onMounted(async () => {
  await Promise.all([
    prospects.load(),
    leads.load(),
    loadVisits(),
    pedidos.load(),
    adminMaster.loadData()
  ]);
  resetProspectForm();
  resetLeadForm();
});

watch(activeView, (view) => {
  if (view === 'map') void renderMap();
});

watch(visits, () => {
  if (activeView.value === 'map') void renderMap();
});

onBeforeUnmount(() => {
  map?.remove();
});
</script>

<template>
  <div class="min-h-screen bg-[#f3f7fa] text-slate-800 antialiased">
    <!-- Top Corporate Navigation Header -->
    <header class="bg-gradient-to-r from-[#073b73] via-[#09478a] to-[#073b73] text-white shadow-lg border-b border-blue-900/50 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <!-- Logo & Status Indicator -->
          <div class="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
            <span class="w-3 h-3 bg-[#8bd329] rounded-full shadow-[0_0_8px_#8bd329]"></span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-extrabold tracking-tight text-white">Grupo San Luis <span class="font-normal text-blue-200 text-sm">| CRM Corporativo</span></h1>
              <span class="bg-[#8bd329]/20 text-[#8bd329] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#8bd329]/30">Enterprise</span>
            </div>
            <p class="text-xs text-blue-100/80 mt-0.5">Pipeline Comercial, Monitoreo GPS &amp; Gestión Integral de Cuentas</p>
          </div>
        </div>

        <!-- Header Actions & Profile -->
        <div class="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <div class="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-xs text-blue-100">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Empresa activa:</span>
            <strong class="text-white">{{ auth.empresa?.nombre }}</strong>
          </div>

          <div class="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-xs text-blue-100">
            <span>👤</span>
            <span class="text-white font-medium">{{ auth.user?.nombre }}</span>
            <span class="bg-blue-400/30 text-sky-200 text-[10px] font-bold px-1.5 py-0.5 rounded">{{ auth.rol }}</span>
          </div>

          <!-- Comment 
         <button
            class="bg-[#8bd329] text-[#073b73] font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all hover:bg-lime-300 hover:shadow-lime-500/20 active:scale-95 flex items-center gap-1.5"
            @click="showModal = true"
          >
            <span>+</span>
            <span>Nuevo Prospecto</span>
          </button>-->

          <button
            class="bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200 border border-white/20 hover:border-red-400/40 px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1"
            title="Cerrar sesión"
            @click="auth.logout"
          >
            <span>↪</span>
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- Error Notification -->
      <div v-if="prospects.error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
        <span>{{ prospects.error }}</span>
        <button class="text-red-500 font-bold text-xs" @click="prospects.error = ''">✕</button>
      </div>

      <!-- Loading State -->
      <div v-if="prospects.loading && !prospects.prospectos.length" class="text-center py-16 text-slate-500 font-medium">
        <div class="inline-block w-8 h-8 border-3 border-[#073b73] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p>Cargando información gerencial de {{ auth.empresa?.nombre }}...</p>
      </div>

      <template v-else>
        <!-- Executive KPI Cards -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <!-- KPI 1 -->
          <article class="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Prospectos Activos</span>
              <span class="p-1.5 rounded-lg bg-blue-50 text-[#073b73] text-xs">🎯</span>
            </div>
            <strong class="text-2xl font-extrabold text-[#073b73] mt-2 block">{{ prospects.activeProspectsCount }}</strong>
            <small class="text-xs text-slate-500 mt-1 block">En embudo comercial</small>
          </article>

          <!-- KPI 2 -->
          <article class="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Valor Pipeline</span>
              <span class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs">💰</span>
            </div>
            <strong class="text-2xl font-extrabold text-emerald-700 mt-2 block">{{ formatCurrency(prospects.pipelineValue) }}</strong>
            <small class="text-xs text-slate-500 mt-1 block">Estimado potencial</small>
          </article>

          <!-- KPI 3 -->
          <article class="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Conversión</span>
              <span class="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs">📈</span>
            </div>
            <strong class="text-2xl font-extrabold text-indigo-600 mt-2 block">{{ prospects.conversionRate }}%</strong>
            <small class="text-xs text-slate-500 mt-1 block">Aprobados a clientes</small>
          </article>

          <!-- KPI 4 -->
          <article class="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Total Cuentas</span>
              <span class="p-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs">🏢</span>
            </div>
            <strong class="text-2xl font-extrabold text-slate-800 mt-2 block">{{ prospects.prospectos.length }}</strong>
            <small class="text-xs text-slate-500 mt-1 block">Registros comerciales</small>
          </article>

          <!-- KPI 5 -->
          <article class="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Visitas GPS</span>
              <span class="p-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs">📍</span>
            </div>
            <strong class="text-2xl font-extrabold text-purple-700 mt-2 block">{{ fieldVisits }}</strong>
            <small class="text-xs text-slate-500 mt-1 block">Check-ins en terreno</small>
          </article>
        </section>

        <!-- Segmented Tab Navigation & Filters Toolbar -->
        <section class="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-sm space-y-3">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <!-- View Tabs -->
            <nav class="flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60" aria-label="Tabs">
              <button
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeView === 'kanban' ? 'bg-[#073b73] text-white shadow-sm' : 'text-slate-600 hover:text-[#073b73] hover:bg-white/80'
                ]"
                @click="activeView = 'kanban'"
              >
                <span>▥</span>
                <span>Tablero Kanban</span>
              </button>
              <button
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeView === 'table' ? 'bg-[#073b73] text-white shadow-sm' : 'text-slate-600 hover:text-[#073b73] hover:bg-white/80'
                ]"
                @click="activeView = 'table'"
              >
                <span>▤</span>
                <span>Tabla de Prospectos</span>
              </button>
              <button
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeView === 'map' ? 'bg-[#073b73] text-white shadow-sm' : 'text-slate-600 hover:text-[#073b73] hover:bg-white/80'
                ]"
                @click="activeView = 'map'"
              >
                <span>◎</span>
                <span>Mapa GPS Vendedores</span>
              </button>
              <button
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeView === 'leads' ? 'bg-[#073b73] text-white shadow-sm' : 'text-slate-600 hover:text-[#073b73] hover:bg-white/80'
                ]"
                @click="activeView = 'leads'"
              >
                <span>✉</span>
                <span>Bandeja Leads</span>
                <span v-if="leads.leads.length" class="bg-blue-200 text-[#073b73] text-[10px] font-bold px-1.5 py-0.2 rounded-full">{{ leads.leads.length }}</span>
              </button>
              <button
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeView === 'pedidos' ? 'bg-[#073b73] text-white shadow-sm' : 'text-slate-600 hover:text-[#073b73] hover:bg-white/80'
                ]"
                @click="activeView = 'pedidos'"
              >
                <span>🛒</span>
                <span>Pedidos &amp; Facturación</span>
                <span v-if="pedidos.pedidos.length" class="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">{{ pedidos.pedidos.length }}</span>
              </button>

              <!-- MASTER TABS -->
              <button
                v-if="auth.rol === 'MASTER' || auth.rol === 'ADMIN'"
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 border border-lime-300/60',
                  activeView === 'usuarios' ? 'bg-[#8bd329] text-[#073b73] shadow-sm font-bold' : 'text-slate-700 bg-lime-50/50 hover:text-[#073b73] hover:bg-lime-100/80'
                ]"
                @click="activeView = 'usuarios'"
              >
                <span>👥</span>
                <span>Usuarios</span>
                <span v-if="adminMaster.usuarios.length" class="bg-[#073b73] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">{{ adminMaster.usuarios.length }}</span>
              </button>

              <button
                v-if="auth.rol === 'MASTER' || auth.rol === 'ADMIN'"
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 border border-lime-300/60',
                  activeView === 'empresas' ? 'bg-[#8bd329] text-[#073b73] shadow-sm font-bold' : 'text-slate-700 bg-lime-50/50 hover:text-[#073b73] hover:bg-lime-100/80'
                ]"
                @click="activeView = 'empresas'"
              >
                <span>🏢</span>
                <span>Empresas</span>
                <span v-if="adminMaster.empresas.length" class="bg-[#073b73] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">{{ adminMaster.empresas.length }}</span>
              </button>

              <button
                v-if="auth.rol === 'MASTER' || auth.rol === 'ADMIN'"
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeView === 'profit-sync' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                ]"
                @click="activeView = 'profit-sync'"
              >
                <span>🔄</span>
                <span>Sincronizar Profit</span>
              </button>
            </nav>

            <!-- Search & Filters Toolbar -->
            <div v-if="activeView === 'kanban' || activeView === 'table'" class="flex flex-wrap items-center gap-2">
              <div class="relative flex-1 min-w-[200px]">
                <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">🔍</span>
                <input
                  v-model="prospects.searchQuery"
                  placeholder="Buscar por razón social o RIF..."
                  class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#073b73] focus:ring-1 focus:ring-[#073b73] transition-all"
                >
              </div>

              <select
                v-model="prospects.selectedSeller"
                class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#073b73] text-slate-700"
              >
                <option>Todos los Vendedores</option>
                <option v-for="s in sellers" :key="s">{{ s }}</option>
              </select>

              <select
                v-model="prospects.selectedStatus"
                class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#073b73] text-slate-700"
              >
                <option>Todos los Estados</option>
                <option v-for="st in statuses" :key="st.value">{{ st.label }}</option>
              </select>

              <button
                class="text-xs font-semibold text-slate-500 hover:text-[#073b73] hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                @click="clearFilters"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </section>

        <!-- VIEW 1: KANBAN BOARD -->
        <section v-if="activeView === 'kanban'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="status in statuses"
            :key="status.value"
            class="bg-slate-100/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col min-h-[480px]"
            @dragover.prevent
            @drop="dropProspect(status.value)"
          >
            <!-- Column Header -->
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :class="status.border.replace('border-', 'bg-')"></span>
                <strong class="text-xs font-bold uppercase tracking-wider text-slate-700">{{ status.label }}</strong>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-xs">
                  {{ filteredProspectos.filter((p) => p.etapa === status.value).length }}
                </span>
              </div>
            </div>

            <!-- Column Total -->
            <div class="mb-3 text-[11px] font-medium text-slate-500 bg-white/60 px-2.5 py-1 rounded-md border border-slate-200/60 flex items-center justify-between">
              <span>Valor etapa:</span>
              <strong class="text-slate-800 font-bold">{{ formatCurrency(getColumnTotal(status.value)) }}</strong>
            </div>

            <!-- Cards Container -->
            <div class="space-y-3 flex-1 overflow-y-auto pr-0.5">
              <article
                v-for="p in filteredProspectos.filter((item) => item.etapa === status.value)"
                :key="p.id"
                class="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing group"
                draggable="true"
                @dragstart="draggingId = p.id"
              >
                <!-- Card Header -->
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                    {{ p.rif }}
                  </span>
                  <span class="text-[10px] text-slate-400">{{ p.fechaContacto }}</span>
                </div>

                <!-- Opportunity Title & Company -->
                <h3 class="font-bold text-sm text-[#073b73] mt-2 group-hover:text-blue-600 transition-colors leading-snug">
                  {{ p.titulo }}
                </h3>
                <p class="text-xs text-slate-600 font-medium mt-1">
                  {{ p.razonSocial }}
                </p>

                <!-- Value & Seller -->
                <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <strong class="text-emerald-700 font-extrabold text-sm">{{ formatCurrency(p.valorEstimado) }}</strong>
                  <div class="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <span>👤</span>
                    <span>{{ p.vendedorNombre }}</span>
                  </div>
                </div>

                <!-- Stage Selector Quick Action -->
                <div class="mt-2.5">
                  <select
                    :value="p.etapa"
                    class="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none text-slate-700 font-medium hover:bg-slate-100 focus:border-[#073b73] transition-colors"
                    @change="prospects.updateStage(p.id, ($event.target as HTMLSelectElement).value as EtapaOportunidad)"
                  >
                    <option v-for="st in statuses" :key="st.value" :value="st.value">Mover a: {{ st.label }}</option>
                  </select>
                </div>
              </article>

              <div
                v-if="!filteredProspectos.filter((item) => item.etapa === status.value).length"
                class="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/30"
              >
                Sin prospectos en esta etapa
              </div>
            </div>
          </div>
        </section>

        <!-- VIEW 2: PROSPECTS TABLE -->
        <section v-else-if="activeView === 'table'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th class="px-4 py-3.5">Razón Social</th>
                  <th class="px-4 py-3.5">RIF</th>
                  <th class="px-4 py-3.5">Oportunidad</th>
                  <th class="px-4 py-3.5">Etapa Actual</th>
                  <th class="px-4 py-3.5 text-right">Valor Estimado</th>
                  <th class="px-4 py-3.5">Vendedor Asignado</th>
                  <th class="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="p in filteredProspectos"
                  :key="p.id"
                  class="hover:bg-slate-50/80 transition-colors"
                >
                  <td class="px-4 py-3.5 font-bold text-slate-900">{{ p.razonSocial }}</td>
                  <td class="px-4 py-3.5 font-mono text-slate-600">{{ p.rif }}</td>
                  <td class="px-4 py-3.5 font-medium text-[#073b73]">
                    {{ p.titulo }}
                    <span class="block text-[10px] text-slate-400 font-normal">Contacto: {{ p.fechaContacto }}</span>
                  </td>
                  <td class="px-4 py-3.5">
                    <select
                      :value="p.etapa"
                      class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold outline-none focus:border-[#073b73]"
                      @change="prospects.updateStage(p.id, ($event.target as HTMLSelectElement).value as EtapaOportunidad)"
                    >
                      <option v-for="st in statuses" :key="st.value" :value="st.value">{{ st.label }}</option>
                    </select>
                  </td>
                  <td class="px-4 py-3.5 text-right font-extrabold text-emerald-700 text-sm">
                    {{ formatCurrency(p.valorEstimado) }}
                  </td>
                  <td class="px-4 py-3.5 font-medium text-slate-600">{{ p.vendedorNombre }}</td>
                  <td class="px-4 py-3.5 text-center">
                    <button
                      class="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded text-xs font-semibold transition-colors"
                      title="Eliminar prospecto"
                      @click="prospects.remove(p.id)"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!filteredProspectos.length" class="text-center py-12 text-slate-500 text-xs">
            No se encontraron prospectos coincidentes con los filtros aplicados.
          </div>
        </section>

        <!-- VIEW 3: LEAFLET GPS MAP -->
        <section v-else-if="activeView === 'map'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
                <span>📍 Mapa Georreferenciado de Vendedores</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">Monitoreo en tiempo real de visitas y check-ins realizados en territorio.</p>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-full border border-purple-200">
                {{ fieldVisits }} check-ins registrados
              </span>
              <span v-if="visitsLoading" class="text-slate-400 animate-pulse">Sincronizando puntos...</span>
            </div>
          </div>
          <div ref="mapElement" class="leaflet-map shadow-inner"></div>
        </section>

        <!-- VIEW 4: LEADS INBOX (BANT / MEDDIC) -->
        <section v-else-if="activeView === 'leads'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
                <span>✉ Bandeja de Leads &amp; Calificación BANT</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">Evalúa Presupuesto, Autoridad, Necesidad y Tiempo antes de promover a Pipeline.</p>
            </div>
            <button
              class="bg-[#073b73] hover:bg-[#0b5b95] text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow transition-colors self-start sm:self-auto flex items-center gap-1.5"
              @click="showLeadModal = true"
            >
              <span>+</span>
              <span>Nuevo Lead</span>
            </button>
          </div>

          <div class="grid grid-cols-1 gap-3.5">
            <article
              v-for="lead in leads.leads"
              :key="lead.id"
              class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <strong class="text-sm font-bold text-slate-900">{{ lead.empresaNombre }}</strong>
                  <span class="text-xs text-slate-600 font-medium">({{ lead.nombreContacto }})</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#073b73]">
                    {{ lead.fuente }}
                  </span>
                  <span v-if="lead.rif" class="font-mono text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                    {{ lead.rif }}
                  </span>
                </div>
                <div class="text-xs text-slate-500 flex items-center gap-3">
                  <span>✉ {{ lead.email || 'Sin email' }}</span>
                  <span>📞 {{ lead.telefono || 'Sin teléfono' }}</span>
                </div>
                <div class="text-xs text-slate-700 pt-1 flex flex-wrap gap-2">
                  <span class="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    <strong>Necesidad:</strong> {{ lead.necesidad || 'Por definir' }}
                  </span>
                  <span class="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    <strong>Presupuesto:</strong> {{ lead.presupuesto ? formatCurrency(lead.presupuesto) : 'Por definir' }}
                  </span>
                </div>
              </div>

              <!-- Qualification Actions -->
              <div class="flex items-center gap-2 self-end md:self-auto">
                <select
                  :value="lead.estadoCalificacion"
                  class="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold outline-none text-slate-700"
                  @change="leads.setCalificacion(lead, ($event.target as HTMLSelectElement).value as any)"
                >
                  <option value="NUEVO">Nuevo</option>
                  <option value="CALIFICADO">Calificado</option>
                  <option value="DESCARTADO">Descartado</option>
                </select>

                <button
                  v-if="lead.estadoCalificacion === 'CALIFICADO'"
                  class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
                  @click="promoteLead(lead.id)"
                >
                  <span>Promover a Kanban ➔</span>
                </button>

                <button
                  class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded text-xs transition-colors"
                  title="Eliminar lead"
                  @click="leads.remove(lead.id)"
                >
                  ✕
                </button>
              </div>
            </article>

            <div v-if="!leads.leads.length" class="text-center py-12 text-slate-500 text-xs">
              No hay leads registrados en la bandeja corporativa.
            </div>
          </div>
        </section>

        <!-- VIEW 5: PEDIDOS & ORDENES -->
        <section v-else-if="activeView === 'pedidos'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
                <span>🛒 Gestión de Pedidos &amp; Órdenes de Venta</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">Control y emisión de pedidos asociados a clientes corporativos aprobados.</p>
            </div>
            <div class="flex items-center gap-2">
              <div class="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs text-emerald-800 font-bold">
                Total Facturación / Aprobados: {{ formatCurrency(pedidos.totalVentas) }}
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th class="px-4 py-3.5">Cliente Corporativo</th>
                  <th class="px-4 py-3.5">RIF</th>
                  <th class="px-4 py-3.5">Renglones / Productos</th>
                  <th class="px-4 py-3.5 text-right">Monto Total</th>
                  <th class="px-4 py-3.5">Vendedor</th>
                  <th class="px-4 py-3.5 text-center">Estado del Pedido</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="ped in pedidos.pedidos"
                  :key="ped.id"
                  class="hover:bg-slate-50/80 transition-colors"
                >
                  <td class="px-4 py-3.5 font-bold text-slate-900">
                    {{ ped.clienteEmpresa?.clienteCorporativo.razonSocial || 'Cliente General' }}
                  </td>
                  <td class="px-4 py-3.5 font-mono text-slate-600">
                    {{ ped.clienteEmpresa?.clienteCorporativo.rif || 'N/A' }}
                  </td>
                  <td class="px-4 py-3.5">
                    <div class="space-y-0.5">
                      <span
                        v-for="d in ped.detalles"
                        :key="d.id"
                        class="block text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60"
                      >
                        {{ d.producto }} &times; {{ d.cantidad }} ({{ formatCurrency(d.precioUnitario) }})
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3.5 text-right font-extrabold text-emerald-700 text-sm">
                    {{ formatCurrency(ped.montoTotal) }}
                  </td>
                  <td class="px-4 py-3.5 font-medium text-slate-600">{{ ped.vendedor?.nombre || 'Vendedor' }}</td>
                  <td class="px-4 py-3.5 text-center">
                    <select
                      :value="ped.estado"
                      class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-bold outline-none focus:border-[#073b73]"
                      @change="pedidos.updateStatus(ped.id, ($event.target as HTMLSelectElement).value as any)"
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="APROBADO">Aprobado</option>
                      <option value="FACTURADO">Facturado</option>
                      <option value="ANULADO">Anulado</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!pedidos.pedidos.length" class="text-center py-12 text-slate-500 text-xs">
            No hay pedidos registrados en la unidad de negocio activa.
          </div>
        </section>
        <!-- VIEW 6: GESTIÓN DE USUARIOS (CRUD COMPLETO) -->
        <section v-else-if="activeView === 'usuarios'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
                <span>👥 Gestión Completa de Usuarios</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">Creación, edición, permisos por empresa y roles de acceso (MASTER, ADMIN, VENDEDOR).</p>
            </div>
            <button
              class="bg-[#8bd329] text-[#073b73] font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all hover:bg-lime-300 active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
              @click="openCreateUserModal"
            >
              <span>+</span>
              <span>Nuevo Usuario</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th class="px-4 py-3.5">Nombre / Usuario</th>
                  <th class="px-4 py-3.5">Correo Electrónico</th>
                  <th class="px-4 py-3.5">Empresas Asignadas &amp; Roles</th>
                  <th class="px-4 py-3.5 text-center">Estado</th>
                  <th class="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="u in adminMaster.usuarios" :key="u.id" class="hover:bg-slate-50/80 transition-colors">
                  <td class="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-full bg-blue-100 text-[#073b73] font-extrabold flex items-center justify-center text-xs">
                      {{ u.nombre.charAt(0).toUpperCase() }}
                    </span>
                    <span>{{ u.nombre }}</span>
                  </td>
                  <td class="px-4 py-3.5 font-mono text-slate-600">{{ u.email }}</td>
                  <td class="px-4 py-3.5">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="ue in u.empresas"
                        :key="ue.empresaId"
                        :class="[
                          'px-2 py-0.5 rounded text-[10px] font-bold border',
                          ue.rol === 'MASTER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          ue.rol === 'ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        ]"
                      >
                        {{ ue.empresaNombre }}: <strong class="uppercase">{{ ue.rol }}</strong>
                      </span>
                      <span v-if="!u.empresas || !u.empresas.length" class="text-slate-400 italic text-[11px]">Sin empresas asignadas</span>
                    </div>
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      ]"
                    >
                      {{ u.activo ? 'ACTIVO' : 'INACTIVO' }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button
                        class="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-semibold transition-colors"
                        @click="openEditUserModal(u)"
                      >
                        Editar
                      </button>
                      <button
                        class="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold transition-colors"
                        @click="removeUsuario(u.id)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- VIEW 7: GESTIÓN DE EMPRESAS (CRUD COMPLETO) -->
        <section v-else-if="activeView === 'empresas'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
                <span>🏢 Catálogo de Empresas &amp; Credenciales Profit</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">Administración de empresas del grupo San Luis y parámetros de conexión SQL Server Profit Plus.</p>
            </div>
            <button
              class="bg-[#8bd329] text-[#073b73] font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all hover:bg-lime-300 active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
              @click="openCreateEmpresaModal"
            >
              <span>+</span>
              <span>Nueva Empresa</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="e in adminMaster.empresas"
              :key="e.id"
              class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:border-[#073b73]/40 transition-all shadow-xs space-y-3"
            >
              <div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-lg bg-blue-100 text-[#073b73] font-bold flex items-center justify-center text-sm">🏢</span>
                  <div>
                    <h3 class="font-extrabold text-sm text-[#073b73]">{{ e.nombre }}</h3>
                    <span class="text-[10px] text-slate-400 font-mono">ID: {{ e.id }}</span>
                  </div>
                </div>
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    e.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  ]"
                >
                  {{ e.activo ? 'ACTIVO' : 'INACTIVO' }}
                </span>
              </div>

              <div class="bg-white p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-500">Host SQL Server:</span>
                  <span class="font-mono text-slate-800">{{ e.profitDbHost || 'No configurado' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-500">Base de Datos:</span>
                  <span class="font-mono text-slate-800">{{ e.profitDbName || 'No configurada' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-500">Usuario Profit:</span>
                  <span class="font-mono text-slate-800">{{ e.profitDbUser || 'No configurado' }}</span>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  class="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  @click="openEditEmpresaModal(e)"
                >
                  Editar Parámetros
                </button>
                <button
                  class="bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  @click="removeEmpresa(e.id)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- VIEW 8: SINCRONIZACIÓN CON PROFIT PLUS (CLIENTES Y VENTAS) -->
        <section v-else-if="activeView === 'profit-sync'" class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 class="text-base font-bold text-[#073b73] flex items-center gap-2">
                <span>🔄 Módulo de Sincronización Profit Plus ERP</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">Sincroniza clientes, datos fiscales y facturación de ventas desde SQL Server Profit hacia el CRM.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 font-medium">Filtrar por empresa:</span>
              <select v-model="syncEmpresaId" class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold outline-none text-slate-700">
                <option value="">Todas las empresas</option>
                <option v-for="e in adminMaster.empresas" :key="e.id" :value="e.id">{{ e.nombre }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Sync Card 1 -->
            <div class="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-2 text-[#073b73] font-bold text-sm">
                  <span>👤</span>
                  <h3>Sincronizar Clientes</h3>
                </div>
                <p class="text-xs text-slate-600 mt-1">Extrae clientes de saCliente, actualiza RIFs en el Maestro Corporativo y vincula la empresa.</p>
              </div>
              <button
                class="w-full bg-[#073b73] hover:bg-[#0b5b95] text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                :disabled="syncRunning"
                @click="runSyncClientes"
              >
                <span>🔄</span>
                <span>Ejecutar Sync Clientes</span>
              </button>
            </div>

            <!-- Sync Card 2 -->
            <div class="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <span>💰</span>
                  <h3>Sincronizar Ventas / Facturación</h3>
                </div>
                <p class="text-xs text-slate-600 mt-1">Extrae facturas de saFacturaVenta, montos y volúmenes para histogramas y reportes.</p>
              </div>
              <button
                class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                :disabled="syncRunning"
                @click="runSyncVentas"
              >
                <span>📊</span>
                <span>Ejecutar Sync Ventas</span>
              </button>
            </div>

            <!-- Sync Card 3 -->
            <div class="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <span>⚡</span>
                  <h3>Sincronización Total Profit</h3>
                </div>
                <p class="text-xs text-slate-600 mt-1">Ejecuta el ciclo completo de importación (Clientes + Ventas) en todas las unidades de negocio.</p>
              </div>
              <button
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                :disabled="syncRunning"
                @click="runSyncAll"
              >
                <span>⚡</span>
                <span>Ejecutar Sincronización General</span>
              </button>
            </div>
          </div>

          <!-- Sync Results Log -->
          <div v-if="adminMaster.syncResults" class="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="text-lime-400 font-bold">✓ Resultado de Sincronización Reciente</span>
              <span class="text-slate-400 text-[10px]">{{ new Date().toLocaleString() }}</span>
            </div>
            <pre class="overflow-x-auto text-[11px] text-slate-300">{{ JSON.stringify(adminMaster.syncResults.data, null, 2) }}</pre>
          </div>
        </section>



      </template>
    </main>

    <!-- MODAL: CREAR / EDITAR USUARIO -->
    <div v-if="showUserModal" class="modal-backdrop" @click.self="showUserModal = false">
      <div class="prospect-modal max-w-lg">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 class="text-lg font-bold text-[#073b73]">{{ editingUserId ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
            <p class="text-xs text-slate-500">Configura la cuenta y los permisos de acceso multitenant.</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 font-bold text-base p-1" @click="showUserModal = false">✕</button>
        </div>

        <form class="space-y-3.5" @submit.prevent="submitUserForm">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
            <input v-model="userForm.nombre" required placeholder="Ej: Carlos Silva" class="w-full">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
            <input v-model="userForm.email" required type="email" placeholder="usuario@gruposanluis.com" class="w-full">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Contraseña {{ editingUserId ? '(Dejar vacío para mantener actual)' : '*' }}
            </label>
            <input v-model="userForm.password" :required="!editingUserId" type="password" placeholder="••••••••" class="w-full">
          </div>

          <div class="flex items-center gap-2 py-1">
            <input v-model="userForm.activo" type="checkbox" id="user-activo" class="w-4 h-4 rounded border-slate-300">
            <label for="user-activo" class="text-xs font-bold text-slate-700 select-none">Usuario Activo</label>
          </div>

          <!-- Company matrix assignments -->
          <div class="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <h4 class="text-xs font-bold text-slate-700 border-b pb-1.5">Permisos por Empresa</h4>
            <div v-for="emp in adminMaster.empresas" :key="emp.id" class="flex items-center justify-between text-xs py-1">
              <span class="font-medium text-slate-800">{{ emp.nombre }}</span>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-400 font-semibold">Rol:</span>
                <select
                  :value="userForm.empresas.find(e => e.empresaId === emp.id)?.rol || 'VENDEDOR'"
                  @change="($event) => {
                    const found = userForm.empresas.find(e => e.empresaId === emp.id);
                    if (found) {
                      found.rol = ($event.target as HTMLSelectElement).value as any;
                    } else {
                      userForm.empresas.push({ empresaId: emp.id, rol: ($event.target as HTMLSelectElement).value as any });
                    }
                  }"
                  class="bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                >
                  <option value="MASTER">MASTER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VENDEDOR">VENDEDOR</option>
                </select>
              </div>
            </div>
          </div>

          <footer class="pt-2 border-t mt-4 flex justify-end gap-2">
            <button type="button" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg" @click="showUserModal = false">
              Cancelar
            </button>
            <button class="bg-[#073b73] hover:bg-[#0b5b95] text-white text-xs font-bold px-4 py-2 rounded-lg shadow">
              Guardar Usuario
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- MODAL: CREAR / EDITAR EMPRESA -->
    <div v-if="showEmpresaModal" class="modal-backdrop" @click.self="showEmpresaModal = false">
      <div class="prospect-modal max-w-lg">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 class="text-lg font-bold text-[#073b73]">{{ editingEmpresaId ? 'Editar Empresa' : 'Nueva Empresa' }}</h2>
            <p class="text-xs text-slate-500">Configura la empresa y sus credenciales de conexión Profit Plus.</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 font-bold text-base p-1" @click="showEmpresaModal = false">✕</button>
        </div>

        <form class="space-y-3.5" @submit.prevent="submitEmpresaForm">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nombre de la Empresa *</label>
            <input v-model="empresaForm.nombre" required placeholder="Ej: San Luis Combustibles" class="w-full">
          </div>

          <div class="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
            <h4 class="text-xs font-bold text-[#073b73] border-b pb-1.5 flex items-center gap-1">
              <span>🔌</span> Parámetros Conexión Profit ERP (SQL Server)
            </h4>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Host / Servidor IP</label>
                <input v-model="empresaForm.profitDbHost" placeholder="Ej: 192.168.1.10" class="w-full text-xs">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Base de Datos</label>
                <input v-model="empresaForm.profitDbName" placeholder="Ej: profit_comb" class="w-full text-xs">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Usuario SQL Server</label>
                <input v-model="empresaForm.profitDbUser" placeholder="Ej: sa" class="w-full text-xs">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Contraseña SQL Server</label>
                <input v-model="empresaForm.profitDbPassword" type="password" placeholder="••••••••" class="w-full text-xs">
              </div>
            </div>

            <!-- Probar conexion button -->
            <div class="pt-1 flex items-center justify-between">
              <button
                type="button"
                @click="testCurrentEmpresaConnection"
                class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded text-xs transition-all flex items-center gap-1.5"
                :disabled="testConnLoading"
              >
                <span v-if="testConnLoading">Probando...</span>
                <span v-else>Probar Conexión</span>
              </button>
              
              <div v-if="testConnResult" :class="['text-xs font-bold', testConnResult.connected ? 'text-emerald-600' : 'text-rose-600']">
                {{ testConnResult.message }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 py-1">
            <input v-model="empresaForm.activo" type="checkbox" id="emp-activo" class="w-4 h-4 rounded border-slate-300">
            <label for="emp-activo" class="text-xs font-bold text-slate-700 select-none">Empresa Activa</label>
          </div>

          <footer class="pt-2 border-t mt-4 flex justify-end gap-2">
            <button type="button" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg" @click="showEmpresaModal = false">
              Cancelar
            </button>
            <button class="bg-[#073b73] hover:bg-[#0b5b95] text-white text-xs font-bold px-4 py-2 rounded-lg shadow">
              Guardar Empresa
            </button>
          </footer>
        </form>
      </div>
    </div>


    <!-- MODAL 1: NUEVO PROSPECTO -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="prospect-modal">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 class="text-lg font-bold text-[#073b73]">Nuevo Prospecto Comercial</h2>
            <p class="text-xs text-slate-500">Registra una oportunidad en el pipeline de {{ auth.empresa?.nombre }}</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 font-bold text-base p-1" @click="showModal = false">✕</button>
        </div>

        <form class="space-y-3.5" @submit.prevent="submitProspect">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Razón Social *</label>
              <input v-model="newProspect.razonSocial" required placeholder="Ej: Inversiones Los Andes C.A." class="w-full">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">RIF Fiscal *</label>
              <input v-model="newProspect.rif" required placeholder="J-12345678-0" class="w-full">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Título de la Oportunidad *</label>
            <input v-model="newProspect.titulo" required placeholder="Ej: Suministro mensual lubricantes y diesel" class="w-full">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Valor Estimado ($) *</label>
              <input v-model.number="newProspect.valorEstimado" type="number" min="0" required class="w-full">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Fecha de Contacto *</label>
              <input v-model="newProspect.fechaContacto" type="date" required class="w-full">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Vendedor Asignado *</label>
            <select v-model="newProspect.vendedorNombre" required class="w-full">
              <option v-for="seller in sellers.slice(1)" :key="seller">{{ seller }}</option>
            </select>
          </div>

          <div v-if="formError" class="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {{ formError }}
          </div>

          <footer>
            <button type="button" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg" @click="showModal = false">
              Cancelar
            </button>
            <button class="bg-[#073b73] hover:bg-[#0b5b95] text-white text-xs font-bold px-4 py-2 rounded-lg shadow" :disabled="prospects.loading">
              Guardar Prospecto
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- MODAL 2: NUEVO LEAD -->
    <div v-if="showLeadModal" class="modal-backdrop" @click.self="showLeadModal = false">
      <div class="prospect-modal">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 class="text-lg font-bold text-[#073b73]">Captar Nuevo Lead</h2>
            <p class="text-xs text-slate-500">Registra un prospecto preliminar para calificar criterios BANT/MEDDIC</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 font-bold text-base p-1" @click="showLeadModal = false">✕</button>
        </div>

        <form class="space-y-3.5" @submit.prevent="submitLead">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nombre de Contacto *</label>
              <input v-model="newLead.nombreContacto" required placeholder="Ej: Ing. Carlos Pérez" class="w-full">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Empresa / Razón Social *</label>
              <input v-model="newLead.empresaNombre" required placeholder="Ej: Transporte Central C.A." class="w-full">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">RIF (Opcional)</label>
              <input v-model="newLead.rif" placeholder="J-12345678-0" class="w-full">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input v-model="newLead.email" type="email" placeholder="contacto@empresa.com" class="w-full">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
              <input v-model="newLead.telefono" placeholder="+58 414..." class="w-full">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Canal de Origen</label>
              <select v-model="newLead.fuente" class="w-full">
                <option value="REFERIDO">Referido</option>
                <option value="WEB">Web / Portal</option>
                <option value="REDES">Redes Sociales</option>
                <option value="LLAMADA">Llamada Comercial</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Presupuesto Estimado ($)</label>
              <input v-model.number="newLead.presupuesto" type="number" min="0" placeholder="0" class="w-full">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Necesidad Detectada</label>
            <input v-model="newLead.necesidad" placeholder="Ej: Requerimiento de 20.000 Lts diesel mensual" class="w-full">
          </div>

          <div v-if="leadFormError" class="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {{ leadFormError }}
          </div>

          <footer>
            <button type="button" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg" @click="showLeadModal = false">
              Cancelar
            </button>
            <button class="bg-[#073b73] hover:bg-[#0b5b95] text-white text-xs font-bold px-4 py-2 rounded-lg shadow" :disabled="leads.loading">
              Crear Lead
            </button>
          </footer>
        </form>
      </div>
    </div>
  </div>
</template>
