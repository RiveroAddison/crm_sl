<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from './stores/auth';
import AdminDashboard from './views/AdminDashboard.vue';
import SellerDashboard from './views/SellerDashboard.vue';
import BrandHeroPanel from './components/auth/BrandHeroPanel.vue';
import LoginForm from './components/auth/LoginForm.vue';
import CompanySelector from './components/auth/CompanySelector.vue';

const auth = useAuthStore();
const error = ref('');
const loading = ref(false);

onMounted(() => {
  void auth.hydrate();
});

async function handleLogin(credentials: { email: string; password: string }) {
  error.value = ''; 
  loading.value = true;
  try { 
    await auth.login(credentials.email, credentials.password); 
  } catch (cause) { 
    error.value = cause instanceof Error ? cause.message : 'Error de autenticación'; 
  } finally { 
    loading.value = false; 
  }
}

async function handleSelectCompany(empresaId: string) {
  error.value = ''; 
  loading.value = true;
  try { 
    await auth.selectEmpresa(empresaId); 
  } catch (cause) { 
    error.value = cause instanceof Error ? cause.message : 'No fue posible seleccionar la empresa'; 
  } finally { 
    loading.value = false; 
  }
}
</script>

<template>
  <div v-if="auth.isInitializing" class="min-h-screen bg-[#073b73] flex flex-col items-center justify-center text-white">
    <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-inner">
      <span class="w-3.5 h-3.5 bg-[#8bd329] rounded-full shadow-[0_0_12px_#8bd329] animate-ping"></span>
    </div>
    <p class="text-sm font-semibold text-blue-100 tracking-wide">Iniciando sesión segura Grupo San Luis...</p>
  </div>
  <AdminDashboard v-else-if="auth.rol === 'ADMIN' || auth.rol === 'MASTER'" />
  <SellerDashboard v-else-if="auth.empresa" />
  <main v-else class="shell">
    <BrandHeroPanel />
    <section class="login-panel">
      <LoginForm 
        v-if="auth.empresas.length === 0" 
        :loading="loading" 
        :error="error" 
        @submit="handleLogin" 
      />
      <CompanySelector 
        v-else 
        :empresas="auth.empresas" 
        :loading="loading" 
        :error="error" 
        @select="handleSelectCompany" 
        @logout="auth.logout" 
      />
    </section>
  </main>
</template>

