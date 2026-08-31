<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  empresas: Array<{ id: string; nombre: string }>;
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'select', empresaId: string): void;
  (e: 'logout'): void;
}>();

const selectedEmpresa = ref('');

function handleSelect() {
  if (selectedEmpresa.value) {
    emit('select', selectedEmpresa.value);
  }
}
</script>

<template>
  <form @submit.prevent="handleSelect">
    <span class="eyebrow">Segundo paso</span>
    <h2>Elige tu empresa</h2>
    <p class="muted">Tu acceso se aislará al espacio seleccionado.</p>
    
    <label>
      Empresa
      <select v-model="selectedEmpresa" required>
        <option disabled value="">Selecciona una empresa</option>
        <option v-for="item in empresas" :key="item.id" :value="item.id">
          {{ item.nombre }}
        </option>
      </select>
    </label>
    
    <p v-if="error" class="error">{{ error }}</p>
    
    <button class="primary" :disabled="loading">
      {{ loading ? 'Preparando espacio...' : 'Entrar al CRM' }} <span>→</span>
    </button>
    
    <button type="button" class="back" @click="emit('logout')">
      Usar otra cuenta
    </button>
  </form>
</template>
