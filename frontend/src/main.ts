import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';
import 'leaflet/dist/leaflet.css';
import { syncPendingOperations } from './services/offlineQueue';

const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: App }] });
createApp(App).use(createPinia()).use(router).mount('#app');

// ===== Service Worker Setup =====

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });

  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'SYNC_REQUIRED') {
      console.log('[App] Sync requerido, intentando sincronizar...');
      try {
        await syncPendingOperations();
        console.log('[App] Sincronizacion completada');
      } catch (err) {
        console.error('[App] Error en sincronizacion:', err);
      }
    }
  });
}

// ===== Online/Offline Handlers =====

window.addEventListener('online', async () => {
  console.log('[App] Conexion restaurada, sincronizando...');
  try {
    await syncPendingOperations();
  } catch (err) {
    console.error('[App] Error al sincronizar:', err);
  }
});

window.addEventListener('offline', () => {
  console.log('[App] Modo offline activo');
});
