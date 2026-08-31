<script setup lang="ts">
type Client = {
  id: string;
  razonSocial: string;
  rif: string;
  vendedor: string;
  visitas: Array<{ semana: number; dia: string; estado: string }>;
};

defineProps<{
  weeks: number[];
  days: string[];
  selectedWeek: number;
  selectedDay: string;
  routeClients: Client[];
  checkingIn: string | null;
  checkInError: string;
}>();

defineEmits<{
  (e: 'update:selectedWeek', week: number): void;
  (e: 'update:selectedDay', day: string): void;
  (e: 'check-in', client: Client): void;
}>();
</script>

<template>
  <section class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-brand-blue">Planificación de Ruta y GPS Check-In</h2>
        <p class="text-sm text-slate-500">Selecciona la semana y el día para registrar tu visita comercial en sitio.</p>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          Semana
          <select :value="selectedWeek" @change="$emit('update:selectedWeek', Number(($event.target as HTMLSelectElement).value))" class="border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
            <option v-for="w in weeks" :key="w" :value="w">Semana {{ w }}</option>
          </select>
        </label>
      </div>
    </div>

    <p v-if="checkInError" class="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">{{ checkInError }}</p>

    <div class="flex flex-wrap gap-2 mb-6">
      <button 
        v-for="d in days" 
        :key="d" 
        class="px-4 py-2 rounded-lg text-sm font-semibold transition border" 
        :class="selectedDay === d ? 'bg-brand-blue text-white border-brand-blue shadow' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" 
        @click="$emit('update:selectedDay', d)"
      >
        {{ d }}
      </button>
    </div>

    <div v-if="routeClients.length" class="space-y-3">
      <div v-for="client in routeClients" :key="client.id" class="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition">
        <div>
          <strong class="block text-brand-blue font-bold">{{ client.razonSocial }}</strong>
          <span class="text-xs text-slate-500">{{ client.rif }} · Estado: <span class="font-semibold text-slate-700">{{ client.visitas.find((v) => v.semana === selectedWeek && v.dia === selectedDay)?.estado }}</span></span>
        </div>
        <button 
          class="bg-brand-green text-brand-ink font-bold px-4 py-2 rounded-lg text-xs transition hover:bg-lime-400 shadow disabled:opacity-50" 
          :disabled="checkingIn === client.id" 
          @click="$emit('check-in', client)"
        >
          {{ checkingIn === client.id ? 'Ubicando...' : 'Marcar visita' }}
        </button>
      </div>
    </div>
    
    <div v-else class="py-8 text-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
      No hay clientes planificados para la Semana {{ selectedWeek }} - {{ selectedDay }}.
    </div>
  </section>
</template>
