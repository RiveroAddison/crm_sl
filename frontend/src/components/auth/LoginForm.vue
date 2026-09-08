<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'submit', credentials: { usuario: string; password: string }): void;
}>();

const usuario = ref('');
const password = ref('');

function handleSubmit() {
  emit('submit', { usuario: usuario.value, password: password.value });
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <span class="eyebrow">Acceso seguro</span>
    <h2>Inicia sesión</h2>
    <p class="muted">Usa tus credenciales para continuar.</p>
    
    <label>
      Usuario
      <input v-model="usuario" type="text" autocomplete="username" required placeholder="Código y nombre">
    </label>
    
    <label>
      Contraseña
      <input v-model="password" type="password" autocomplete="current-password" required placeholder="••••••••">
    </label>
    
    <p v-if="error" class="error">{{ error }}</p>
    
    <button class="primary" :disabled="loading">
      {{ loading ? 'Validando...' : 'Continuar' }} <span>→</span>
    </button>
  </form>
</template>
