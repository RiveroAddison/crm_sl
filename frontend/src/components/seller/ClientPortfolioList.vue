<script setup lang="ts">
type Client = {
  id: string;
  razonSocial: string;
  rif: string;
  estado: string;
};

defineProps<{
  filteredClients: Client[];
  search: string;
}>();

defineEmits<{
  (e: 'update:search', value: string): void;
}>();
</script>

<template>
  <section class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-brand-blue">Clientes de mi cartera</h2>
        <p class="text-sm text-slate-500">Consulta rápida de clientes asignados</p>
      </div>
      <div class="relative w-full sm:w-72">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">⌕</span>
        <input 
          :value="search" 
          placeholder="Buscar por empresa o RIF" 
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
          class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
      </div>
    </div>

    <div class="divide-y divide-slate-100">
      <div v-for="client in filteredClients" :key="client.rif" class="py-3 flex items-center justify-between hover:bg-slate-50 px-3 rounded-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-sky text-brand-blue font-bold flex items-center justify-center text-sm shadow-sm">{{ client.razonSocial.slice(0, 1) }}</div>
          <div>
            <strong class="block text-brand-blue font-semibold">{{ client.razonSocial }}</strong>
            <p class="text-xs text-slate-400 mt-0.5">{{ client.rif }} · <span class="font-medium text-slate-600">{{ client.estado }}</span></p>
          </div>
        </div>
        <button class="w-8 h-8 rounded-full bg-slate-100 hover:bg-brand-blue hover:text-white transition flex items-center justify-center text-slate-500 text-sm font-bold" title="Ver cliente">→</button>
      </div>
    </div>
  </section>
</template>
