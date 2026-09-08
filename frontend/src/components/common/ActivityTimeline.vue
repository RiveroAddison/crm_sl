<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ActividadOportunidad, CreateActividadOportunidadInput, TipoActividadOportunidad } from '../../domain/prospecto';

const props = defineProps<{
  actividades: ActividadOportunidad[];
  loading?: boolean;
  allowAdd?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add', data: CreateActividadOportunidadInput): void;
}>();

const showForm = ref(false);
const tipo = ref<TipoActividadOportunidad>('SEGUIMIENTO');
const descripcion = ref('');
const fecha = ref(new Date().toISOString().slice(0, 10));

const tipos: { value: TipoActividadOportunidad; label: string; icon: string }[] = [
  { value: 'LLAMADA', label: 'Llamada', icon: '📞' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
  { value: 'EMAIL', label: 'Correo', icon: '📧' },
  { value: 'VISITA', label: 'Visita', icon: ' visitas' },
  { value: 'REUNION', label: 'Reunión', icon: '🤝' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento', icon: '📋' },
  { value: 'CAPTACION', label: 'Captación', icon: '🎯' },
  { value: 'NOTA', label: 'Nota', icon: '📝' },
];

const canSubmit = computed(() => descripcion.value.length >= 5);

function getTipoInfo(tipo: string) {
  return tipos.find((t) => t.value === tipo) || { label: tipo, icon: '📋' };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function handleSubmit() {
  if (!canSubmit.value) return;
  emit('add', {
    tipo: tipo.value,
    descripcion: descripcion.value,
    fecha: fecha.value,
  });
  descripcion.value = '';
  showForm.value = false;
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Actividades</h4>
      <button
        v-if="allowAdd"
        type="button"
        class="text-xs font-bold text-[#073b73] hover:text-[#0b5b95] transition-colors"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Cancelar' : '+ Nueva' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] font-bold text-slate-500 mb-1">Tipo *</label>
          <select
            v-model="tipo"
            class="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#073b73]"
          >
            <option v-for="t in tipos" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 mb-1">Fecha</label>
          <input
            v-model="fecha"
            type="date"
            class="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#073b73]"
          />
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold text-slate-500 mb-1">Descripción *</label>
        <textarea
          v-model="descripcion"
          rows="2"
          placeholder="Describe la actividad realizada..."
          class="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#073b73]"
        ></textarea>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          :disabled="!canSubmit"
          class="px-3 py-1.5 bg-[#073b73] text-white text-xs font-bold rounded-lg hover:bg-[#0b5b95] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handleSubmit"
        >
          Guardar
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4 text-xs text-slate-400">Cargando actividades...</div>

    <div v-else-if="actividades.length === 0" class="text-center py-4 text-xs text-slate-400">
      Sin actividades registradas
    </div>

    <div v-else class="space-y-2 max-h-60 overflow-y-auto">
      <div
        v-for="act in actividades"
        :key="act.id"
        class="flex gap-3 p-2.5 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
      >
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-[#073b73]/10 flex items-center justify-center text-sm">
          {{ getTipoInfo(act.tipo).icon }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-[#073b73] uppercase">{{ getTipoInfo(act.tipo).label }}</span>
            <span class="text-[10px] text-slate-400">{{ formatDate(act.fecha) }}</span>
          </div>
          <p class="text-xs text-slate-600 mt-0.5 break-words">{{ act.descripcion }}</p>
          <p class="text-[10px] text-slate-400 mt-1">por {{ act.autor.nombre }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
