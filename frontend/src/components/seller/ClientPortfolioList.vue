<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type Client = {
  id: string;
  razonSocial: string;
  rif: string;
  estado: string;
  vendedor?: string;
};

const props = withDefaults(
  defineProps<{
    filteredClients: Client[];
    search: string;
    onlyWithSales?: boolean;
  }>(),
  {
    onlyWithSales: false,
  },
);

defineEmits<{
  (e: 'update:search', value: string): void;
  (e: 'update:onlyWithSales', value: boolean): void;
  (e: 'select-client', client: Client): void;
}>();

// ────────────────────────────────────────────────────────────────────────────
// Paginación: 5 clientes por página (requisito funcional del dashboard)
// ────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 5;
const currentPage = ref(1);

// Si cambia la búsqueda, el switch "solo con ventas" o el universo de
// resultados, volvemos a la página 1 para evitar quedar atrapado en
// una página vacía.
watch(
  () => [props.search, props.onlyWithSales, props.filteredClients.length],
  () => {
    currentPage.value = 1;
  },
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.filteredClients.length / PAGE_SIZE)),
);

const safePage = computed(() => Math.min(currentPage.value, totalPages.value));

const paginatedClients = computed(() => {
  const start = (safePage.value - 1) * PAGE_SIZE;
  return props.filteredClients.slice(start, start + PAGE_SIZE);
});

// Ventana de páginas a mostrar: hasta 5 botones con elipsis si hace falta
const visiblePageNumbers = computed<(number | '…')[]>(() => {
  const total = totalPages.value;
  const current = safePage.value;
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
});

const rangeLabel = computed(() => {
  if (props.filteredClients.length === 0) return 'Sin resultados';
  const from = (safePage.value - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage.value * PAGE_SIZE, props.filteredClients.length);
  return `Mostrando ${from}–${to} de ${props.filteredClients.length} cliente${props.filteredClients.length === 1 ? '' : 's'}`;
});

function goToPage(page: number): void {
  if (page < 1 || page > totalPages.value || page === safePage.value) return;
  currentPage.value = page;
}

function prevPage(): void {
  if (safePage.value > 1) currentPage.value = safePage.value - 1;
}

function nextPage(): void {
  if (safePage.value < totalPages.value) currentPage.value = safePage.value + 1;
}
</script>

<template>
  <section class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-brand-blue">Clientes de mi cartera</h2>
        <p class="text-sm text-slate-500">Consulta rápida de clientes asignados</p>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
        <label
          class="inline-flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg pl-2.5 pr-3 py-1.5 transition"
          :title="onlyWithSales ? 'Mostrando solo clientes con ventas registradas en los últimos 9 meses' : 'Mostrar todos los clientes de mi cartera'"
        >
          <span
            class="text-xs font-bold text-brand-blue w-4 h-4 rounded-full bg-white border border-brand-blue flex items-center justify-center shrink-0"
            aria-hidden="true"
          >$</span>
          <span class="text-xs font-semibold text-slate-700">Solo con ventas</span>
          <span class="relative inline-flex items-center">
            <input
              type="checkbox"
              role="switch"
              class="peer sr-only"
              :checked="onlyWithSales"
              aria-label="Filtrar solo clientes con ventas"
              @change="$emit('update:onlyWithSales', ($event.target as HTMLInputElement).checked)"
            >
            <span
              class="w-9 h-5 rounded-full bg-slate-300 peer-checked:bg-brand-blue transition-colors duration-200 ease-in-out"
              aria-hidden="true"
            ></span>
            <span
              class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out peer-checked:translate-x-4"
              aria-hidden="true"
            ></span>
          </span>
        </label>
        <div class="relative w-full sm:w-72">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">⌕</span>
          <input
            :value="search"
            placeholder="Buscar por empresa, RIF o estado"
            aria-label="Buscar clientes"
            @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
            class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
        </div>
      </div>
    </div>

    <!-- Lista de clientes (paginada) -->
    <div v-if="paginatedClients.length" class="divide-y divide-slate-100">
      <div
        v-for="client in paginatedClients"
        :key="client.rif"
        class="py-3 flex items-center justify-between hover:bg-slate-50 px-3 rounded-lg transition"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-brand-sky text-brand-blue font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
            {{ client.razonSocial.slice(0, 1).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <strong class="block text-brand-blue font-semibold truncate">{{ client.razonSocial }}</strong>
            <p class="text-xs text-slate-400 mt-0.5 truncate">
              {{ client.rif }} · <span class="font-medium text-slate-600">{{ client.estado }}</span>
            </p>
          </div>
        </div>
        <button
          class="w-8 h-8 rounded-full bg-slate-100 hover:bg-brand-blue hover:text-white transition flex items-center justify-center text-slate-500 text-sm font-bold shrink-0"
          title="Ver histograma de ventas del cliente"
          aria-label="Ver histograma de ventas del cliente"
          @click="$emit('select-client', client)"
        >→</button>
      </div>
    </div>

    <!-- Estado vacío: contextual según los filtros activos -->
    <div v-else class="py-10 text-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
      <p v-if="onlyWithSales && search.trim()">
        No hay clientes con ventas registradas que coincidan con
        <span class="font-semibold text-slate-600">"{{ search }}"</span>.
      </p>
      <p v-else-if="onlyWithSales">
        No tienes clientes con ventas registradas en los últimos 9 meses.
      </p>
      <p v-else-if="search.trim()">
        No se encontraron clientes que coincidan con
        <span class="font-semibold text-slate-600">"{{ search }}"</span>.
      </p>
      <p v-else>Aún no tienes clientes asignados en tu cartera.</p>
    </div>

    <!-- Controles de paginación (solo cuando hay más de una página) -->
    <div
      v-if="filteredClients.length > PAGE_SIZE"
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-slate-100"
    >
      <p class="text-xs text-slate-500" role="status" aria-live="polite">{{ rangeLabel }}</p>

      <nav class="flex items-center gap-1" aria-label="Paginación de clientes">
        <button
          class="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="safePage <= 1"
          aria-label="Página anterior"
          @click="prevPage"
        >‹</button>

        <template v-for="(item, idx) in visiblePageNumbers" :key="`${item}-${idx}`">
          <span v-if="item === '…'" class="px-1 text-slate-400 text-xs select-none">…</span>
          <button
            v-else
            class="min-w-[2rem] h-8 px-2 rounded-lg border text-sm font-semibold transition"
            :class="item === safePage
              ? 'bg-brand-blue text-white border-brand-blue shadow'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'"
            :aria-current="item === safePage ? 'page' : undefined"
            :aria-label="`Ir a la página ${item}`"
            @click="goToPage(item as number)"
          >{{ item }}</button>
        </template>

        <button
          class="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="safePage >= totalPages"
          aria-label="Página siguiente"
          @click="nextPage"
        >›</button>
      </nav>
    </div>
  </section>
</template>
