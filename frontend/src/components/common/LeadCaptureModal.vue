<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TipoRif } from '../../domain/lead';

const props = defineProps<{
  loading: boolean;
  error: string;
  cuentasComerciales?: Array<{ id: string; nombre: string; rif: string | null }>;
}>();

const emit = defineEmits<{
  (e: 'submit', data: any): void;
  (e: 'close'): void;
}>();

const empresaNombre = ref('');
const tipoRif = ref<TipoRif>('V');
const numeroRif = ref('');
const digitoVerificador = ref('');
const direccion = ref('');
const telefonoEmpresa = ref('');
const tipoIndustria = ref('');
const cedulaContacto = ref('');
const nombreContacto = ref('');
const cargoContacto = ref('');
const telefonoContacto = ref('');
const emailContacto = ref('');
const fuente = ref<'WEB' | 'MENSAJE' | 'CORREO' | 'REUNION' | 'LLAMADA' | 'REFERIDO' | 'REDES'>('WEB');
const fechaCaptacion = ref(new Date().toISOString().slice(0, 10));
const descripcionCaptacion = ref('');
const cuentaComercialId = ref('');

const tiposRif: TipoRif[] = ['V', 'J', 'E', 'G', 'R', 'P'];
const fuentes = [
  { value: 'WEB', label: 'Web' },
  { value: 'MENSAJE', label: 'Mensaje (WhatsApp/SMS)' },
  { value: 'CORREO', label: 'Correo Electrónico' },
  { value: 'REUNION', label: 'Reunión' },
  { value: 'LLAMADA', label: 'Llamada Telefónica' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'REDES', label: 'Redes Sociales' },
];

const isValid = computed(() => {
  return (
    empresaNombre.value.length >= 2 &&
    nombreContacto.value.length >= 2 &&
    numeroRif.value.length >= 8 &&
    digitoVerificador.value.length === 1
  );
});

function handleSubmit() {
  if (!isValid.value) return;
  
  emit('submit', {
    empresaNombre: empresaNombre.value,
    tipoRif: tipoRif.value,
    numeroRif: numeroRif.value,
    digitoVerificador: digitoVerificador.value,
    direccion: direccion.value || undefined,
    telefonoEmpresa: telefonoEmpresa.value || undefined,
    tipoIndustria: tipoIndustria.value || undefined,
    cedulaContacto: cedulaContacto.value || undefined,
    nombreContacto: nombreContacto.value,
    cargoContacto: cargoContacto.value || undefined,
    telefonoContacto: telefonoContacto.value || undefined,
    emailContacto: emailContacto.value || undefined,
    fuente: fuente.value,
    fechaCaptacion: fechaCaptacion.value,
    descripcionCaptacion: descripcionCaptacion.value || undefined,
    cuentaComercialId: cuentaComercialId.value || undefined,
  });
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <h2 class="text-lg font-bold text-[#073b73]">Captar Nuevo Lead</h2>
        <button
          class="text-slate-400 hover:text-slate-600 transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div v-if="error" class="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-6">
        <fieldset class="border border-slate-200 rounded-xl p-4">
          <legend class="text-sm font-bold text-[#073b73] px-2">Datos de la Empresa</legend>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">RIF *</label>
              <div class="flex gap-2">
                <select
                  v-model="tipoRif"
                  class="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                >
                  <option v-for="tipo in tiposRif" :key="tipo" :value="tipo">{{ tipo }}</option>
                </select>
                <input
                  v-model="numeroRif"
                  type="text"
                  placeholder="12345678"
                  maxlength="9"
                  pattern="[0-9]{8,9}"
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                  required
                />
                <span class="flex items-center text-slate-500">-</span>
                <input
                  v-model="digitoVerificador"
                  type="text"
                  placeholder="0"
                  maxlength="1"
                  pattern="[0-9]"
                  class="w-12 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:border-[#073b73]"
                  required
                />
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Razón Social *</label>
              <input
                v-model="empresaNombre"
                type="text"
                placeholder="Nombre de la empresa"
                minlength="2"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de Industria</label>
              <input
                v-model="tipoIndustria"
                type="text"
                placeholder="Ej: Alimentos, Combustibles..."
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
              <input
                v-model="telefonoEmpresa"
                type="tel"
                placeholder="0212-1234567"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
              <input
                v-model="direccion"
                type="text"
                placeholder="Dirección de la empresa"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>
          </div>
        </fieldset>

        <fieldset class="border border-slate-200 rounded-xl p-4">
          <legend class="text-sm font-bold text-[#073b73] px-2">Datos del Contacto</legend>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Cédula</label>
              <input
                v-model="cedulaContacto"
                type="text"
                placeholder="V-12345678"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nombre del Contacto *</label>
              <input
                v-model="nombreContacto"
                type="text"
                placeholder="Nombre completo"
                minlength="2"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
              <input
                v-model="cargoContacto"
                type="text"
                placeholder="Ej: Gerente de Compras"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
              <input
                v-model="telefonoContacto"
                type="tel"
                placeholder="0414-1234567"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                v-model="emailContacto"
                type="email"
                placeholder="correo@empresa.com"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              />
            </div>
          </div>
        </fieldset>

        <fieldset class="border border-slate-200 rounded-xl p-4">
          <legend class="text-sm font-bold text-[#073b73] px-2">Actividad de Captación</legend>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Captado por *</label>
              <select
                v-model="fuente"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              >
                <option v-for="f in fuentes" :key="f.value" :value="f.value">
                  {{ f.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Fecha de Captación *</label>
              <input
                v-model="fechaCaptacion"
                type="date"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
                required
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Descripción / Nota</label>
              <textarea
                v-model="descripcionCaptacion"
                rows="3"
                placeholder="Describe qué se conversó con el posible cliente..."
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
              ></textarea>
            </div>
          </div>
        </fieldset>

        <div v-if="cuentasComerciales?.length">
          <label class="block text-xs font-bold text-slate-700 mb-1">Cuenta Comercial (opcional)</label>
          <select
            v-model="cuentaComercialId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
          >
            <option value="">Ninguna (se creará automáticamente)</option>
            <option
              v-for="cuenta in cuentasComerciales"
              :key="cuenta.id"
              :value="cuenta.id"
            >
              {{ cuenta.nombre }} ({{ cuenta.rif || 'Sin RIF' }})
            </option>
          </select>
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
            class="px-6 py-2 bg-[#8bd329] text-[#073b73] font-bold rounded-lg text-sm shadow-md transition-all hover:bg-lime-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="animate-spin">⏳</span>
            <span>{{ loading ? 'Capturando...' : 'Captar Lead' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
