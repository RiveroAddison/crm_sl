<script setup lang="ts">
type Sale = { mes: string; semana: number; unidades: number; monto: number };

withDefaults(
  defineProps<{
    months: string[];
    sales: number[];
    selectedMonth: string;
    selectedMonthTotal: number;
    selectedMonthUnits: number;
    weeklyBreakdown: number[];
    selectedMonthSales: Sale[];
    chartTitle?: string;
    chartSubtitle?: string;
    clearLabel?: string;
  }>(),
  {
    chartTitle: 'Histograma de Ventas (Últimos 9 Meses)',
    chartSubtitle: 'Toca o haz clic en cualquier mes para desglosar el detalle de las 4 semanas.',
    clearLabel: '',
  },
);

defineEmits<{
  (e: 'update:selectedMonth', month: string): void;
  (e: 'clear-selection'): void;
}>();
</script>

<template>
  <section class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div class="min-w-0">
        <div class="flex items-center gap-3 flex-wrap">
          <h2 class="text-xl font-bold text-brand-blue">{{ chartTitle }}</h2>
          <span class="bg-sky-100 text-brand-blue font-semibold text-xs px-2.5 py-0.5 rounded-full">Interactivo</span>
          <button
            v-if="clearLabel"
            type="button"
            class="ml-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-3 py-1 transition"
            :aria-label="clearLabel"
            @click="$emit('clear-selection')"
          >
            <span aria-hidden="true">✕</span>
            <span>{{ clearLabel }}</span>
          </button>
        </div>
        <p class="text-sm text-slate-500 mt-1">{{ chartSubtitle }}</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span class="w-3 h-3 bg-brand-blue rounded inline-block"></span> Ventas ($)
          <span class="w-3 h-3 bg-brand-green rounded inline-block ml-2"></span> Unidades
        </div>
      </div>
    </div>

    <!-- Chart Bars -->
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 overflow-x-auto">
      <div class="flex justify-between text-xs text-slate-400 mb-2">
        <span>$0</span>
        <span>${{ Math.round(Math.max(...sales, 1)).toLocaleString('es-VE') }}</span>
      </div>
      <div class="flex items-end gap-3 h-48 pt-4 px-2 min-w-[500px]">
        <button 
          v-for="(month, index) in months" 
          :key="month" 
          class="flex-1 flex flex-col items-center h-full justify-end group transition" 
          @click="$emit('update:selectedMonth', month)"
        >
          <div class="w-full bg-slate-200 rounded-t group-hover:bg-brand-blue-light/50 transition relative flex items-end justify-center" :class="{ 'ring-2 ring-brand-blue': selectedMonth === month }" :style="{ height: '100%' }">
            <div class="w-full bg-brand-blue rounded-t transition-all group-hover:bg-brand-blue-light" :style="{ height: `${sales[index] / Math.max(...sales, 1) * 100}%` }"></div>
          </div>
          <span class="text-xs font-bold mt-2" :class="selectedMonth === month ? 'text-brand-blue underline' : 'text-slate-600'">{{ month }}</span>
        </button>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 bg-brand-sky p-4 rounded-lg border border-sky-100">
      <strong class="text-brand-blue text-sm">DESGLOSE SEMANAL: <span class="underline font-semibold">{{ selectedMonth || 'Sin datos' }}</span></strong>
      <strong class="text-brand-blue text-sm">Total Mes: <span class="text-brand-green-dark font-bold">${{ selectedMonthTotal.toLocaleString('es-VE') }}</span> (<span class="text-slate-700">{{ selectedMonthUnits }} uds</span>)</strong>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <article v-for="(amount, index) in weeklyBreakdown" :key="index" class="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase">Semana {{ index + 1 }}</span>
          <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">{{ selectedMonthTotal ? Math.round(amount / selectedMonthTotal * 100) : 0 }}%</span>
        </div>
        <strong class="text-lg font-bold text-brand-blue">${{ amount.toLocaleString('es-VE') }}</strong>
        <small class="text-xs text-slate-400 mt-1">{{ selectedMonthSales.filter((s) => s.semana === index + 1).reduce((total, s) => total + s.unidades, 0) }} unidades</small>
      </article>
    </div>
  </section>
</template>
