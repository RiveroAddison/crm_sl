<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Lead } from '../../domain/lead';

const props = defineProps<{
  lead: Lead;
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'submit', data: { rubro: string; motivo: string }): void;
  (e: 'close'): void;
}>();

const rubro = ref('');
const motivo = ref('');

const rubros = [
  { value: 'COMBUSTIBLE', label: 'Combustible' },
  { value: 'LUBRICANTES', label: 'Lubricantes' },
  { value: 'AUTOPARTES', label: 'Autopartes' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTOS_BALANCEADOS', label: 'Alimentos Balanceados' },
  { value: 'ALIMENTOS_CONGELADOS', label: 'Alimentos Congelados' },
];

const isValid = computed(() => {
  return rubro.value && motivo.value.length >= 10;
});

function handleSubmit() {
  if (!isValid.value) return;
  
  emit('submit', {
    rubro: rubro.value,
    motivo: motivo.value,
  });
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <h2 class="text-lg font-bold text-red-600">Rechazar Lead</h2>
        <button
          class="text-slate-400 hover:text-slate-600 transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="px-5 pt-4 pb-2 bg-slate-50">
        <p class="text-sm text-slate-600">
          <strong class="text-slate-900">{{ lead.empresaNombre }}</strong>
          <span v-if="lead.rif" class="ml-2 font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">
            {{ lead.rif }}
          </span>
        </p>
        <p class="text-xs text-slate-500 mt-1">Contacto: {{ lead.nombreContacto }}</p>
      </div>

      <div v-if="error" class="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Rubro a rechazar *</label>
          <select
            v-model="rubro"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar rubro</option>
            <option v-for="r in rubros" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Motivo del rechazo *</label>
          <textarea
            v-model="motivo"
            rows="4"
            placeholder="Describe el motivo del rechazo (mínimo 10 caracteres)..."
            minlength="10"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          ></textarea>
        </div>

        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-xs text-blue-800">
            ℹ️ El lead seguirá disponible para otros rubros que no hayan sido rechazados.
          </p>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!isValid || loading"
            class="px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-sm shadow-md transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="animate-spin">⏳</span>
            <span>{{ loading ? 'Rechazando...' : 'Rechazar Lead' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
