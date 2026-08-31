<script setup lang="ts">
import type { EtapaOportunidad } from '../../domain/prospectos';

defineProps<{
  newProspect: {
    razonSocial: string;
    rif: string;
    titulo: string;
    etapa: EtapaOportunidad;
    valorEstimado: number;
    fechaContacto: string;
    vendedorNombre: string;
  };
  availableSellers?: string[];
  loading: boolean;
  error: string;
  isAdmin?: boolean;
}>();

defineEmits<{
  (e: 'submit'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
    <form class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100" @submit.prevent="$emit('submit')">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <h2 class="text-xl font-bold text-brand-blue">Nuevo prospecto</h2>
        <button type="button" class="text-slate-400 hover:text-slate-600 text-lg font-bold" @click="$emit('close')">✕</button>
      </div>
      
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
        Razón social
        <input v-model="newProspect.razonSocial" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
      </label>
      
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
        RIF
        <input v-model="newProspect.rif" required placeholder="J-12345678-0" class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
      </label>
      
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
        Oportunidad
        <input v-model="newProspect.titulo" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
      </label>
      
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
        Valor estimado
        <input v-model.number="newProspect.valorEstimado" type="number" min="0" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
      </label>
      
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
        Fecha de contacto
        <input v-model="newProspect.fechaContacto" type="date" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
      </label>

      <label v-if="isAdmin && availableSellers" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
        Vendedor
        <select v-model="newProspect.vendedorNombre" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue">
          <option v-for="seller in availableSellers.slice(1)" :key="seller">{{ seller }}</option>
        </select>
      </label>

      <p v-if="error" class="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">{{ error }}</p>

      <footer class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition" @click="$emit('close')">Cancelar</button>
        <button class="bg-brand-green text-brand-ink font-bold px-5 py-2 rounded-lg text-sm transition hover:bg-lime-400 shadow disabled:opacity-50" :disabled="loading">Crear prospecto</button>
      </footer>
    </form>
  </div>
</template>
