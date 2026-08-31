<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'submit', credentials: { email: string; password: string }): void;
}>();

const email = ref('');
const password = ref('');

function handleSubmit() {
  emit('submit', { email: email.value, password: password.value });
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <span class="eyebrow">Acceso seguro</span>
    <h2>Inicia sesión</h2>
    <p class="muted">Usa tus credenciales globales para continuar.</p>
    
    <label>
      Correo electrónico
      <input v-model="email" type="email" autocomplete="email" required placeholder="nombre@empresa.com">
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
