<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Lead, TipoCliente } from '../../domain/lead';
import { tiposClienteApi } from '../../services/tiposCliente.api';
import { usuariosApi } from '../../services/admin.api';

const props = defineProps<{
  lead: Lead;
  loading: boolean;
  error: string;
  userRole: string;
  userEmpresaId: string;
  userEmpresaRubro: string;
}>();

const emit = defineEmits<{
  (e: 'submit', data: any): void;
  (e: 'close'): void;
}>();

const rubro = ref('');
const estimadoCompra = ref(0);
const necesidadUnidades = ref(1);
const fechaEstimadaCierre = ref('');
const tipoClienteId = ref('');
const vendedorAsignadoId = ref('');

const tiposCliente = ref<TipoCliente[]>([]);
const vendedores = ref<Array<{ id: string; nombre: string }>>([]);

// MASTER ve todos los rubros, ADMIN solo los de su empresa
const allRubros = [
  { value: 'COMBUSTIBLE', label: 'Combustible' },
  { value: 'LUBRICANTES', label: 'Lubricantes' },
  { value: 'AUTOPARTES', label: 'Autopartes' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTOS_BALANCEADOS', label: 'Alimentos Balanceados' },
  { value: 'ALIMENTOS_CONGELADOS', label: 'Alimentos Congelados' },
];

// Mapeo de rubro de empresa a valor del select
const rubroEmpresaToValue: Record<string, string> = {
  'Combustible': 'COMBUSTIBLE',
  'Lubricantes': 'LUBRICANTES',
  'Autopartes': 'AUTOPARTES',
  'Transporte': 'TRANSPORTE',
  'Alimentos Balanceados': 'ALIMENTOS_BALANCEADOS',
  'Alimentos Congelados': 'ALIMENTOS_CONGELADOS',
};

const rubros = computed(() => {
  if (props.userRole === 'MASTER') return allRubros;
  // ADMIN: si tiene rubro definido, solo ese; si no, todos
  if (!props.userEmpresaRubro) return allRubros;
  const rubroValue = rubroEmpresaToValue[props.userEmpresaRubro];
  if (!rubroValue) return allRubros;
  return allRubros.filter(r => r.value === rubroValue);
});

const isValid = computed(() => {
  return (
    rubro.value &&
    estimadoCompra.value >= 0 &&
    necesidadUnidades.value >= 1 &&
    fechaEstimadaCierre.value &&
    tipoClienteId.value &&
    vendedorAsignadoId.value
  );
});

onMounted(async () => {
  await cargarDatos();
});

async function cargarDatos() {
  // Para MASTER: usar empresaId del lead. Para ADMIN: usar empresaId del usuario.
  const empresaIdParaDatos = props.userRole === 'MASTER' ? props.lead.empresaId : props.userEmpresaId;

  try {
    const tiposResponse = await tiposClienteApi.list(empresaIdParaDatos);
    tiposCliente.value = tiposResponse;
  } catch (error) {
    console.error('Error al cargar tipos de cliente:', error);
  }

  if (empresaIdParaDatos) {
    try {
      const vendedoresResponse = await usuariosApi.listVendedoresByEmpresa(empresaIdParaDatos);
      vendedores.value = vendedoresResponse;
    } catch (error) {
      console.error('Error al cargar vendedores:', error);
    }
  }
}

function handleSubmit() {
  if (!isValid.value) return;
  
  emit('submit', {
    rubro: rubro.value,
    estimadoCompra: estimadoCompra.value,
    necesidadUnidades: necesidadUnidades.value,
    fechaEstimadaCierre: fechaEstimadaCierre.value,
    tipoClienteId: tipoClienteId.value,
    vendedorAsignadoId: vendedorAsignadoId.value,
  });
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <h2 class="text-lg font-bold text-[#073b73]">Aprobar Lead</h2>
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
          <label class="block text-xs font-bold text-slate-700 mb-1">Rubro a asignar *</label>
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
          <label class="block text-xs font-bold text-slate-700 mb-1">Estimado de compra ($) *</label>
          <input
            v-model.number="estimadoCompra"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Necesidad (unidades) *</label>
          <input
            v-model.number="necesidadUnidades"
            type="number"
            min="1"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Fecha estimada de cierre *</label>
          <input
            v-model="fechaEstimadaCierre"
            type="date"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de cliente *</label>
          <select
            v-model="tipoClienteId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar tipo</option>
            <option v-for="tipo in tiposCliente" :key="tipo.id" :value="tipo.id">
              {{ tipo.nombre }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Asignar vendedor *</label>
          <select
            v-model="vendedorAsignadoId"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#073b73]"
            required
          >
            <option value="">Seleccionar vendedor</option>
            <option v-for="v in vendedores" :key="v.id" :value="v.id">
              {{ v.nombre }}
            </option>
          </select>
        </div>

        <div v-if="lead.crossSelling" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-xs text-amber-800">
            <strong>⚠️ Este cliente ya compra en:</strong>
            <span v-if="lead.crossSelling.combustible === 'COMPRA'"> Combustible</span>
            <span v-if="lead.crossSelling.lubricantes === 'COMPRA'"> Lubricantes</span>
            <span v-if="lead.crossSelling.autopartes === 'COMPRA'"> Autopartes</span>
            <span v-if="lead.crossSelling.transporte === 'COMPRA'"> Transporte</span>
            <span v-if="lead.crossSelling.alimentosBalanceados === 'COMPRA'"> Alimentos Balanceados</span>
            <span v-if="lead.crossSelling.alimentosCongelados === 'COMPRA'"> Alimentos Congelados</span>
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
            class="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm shadow-md transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="animate-spin">⏳</span>
            <span>{{ loading ? 'Aprobando...' : 'Aprobar Lead' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
