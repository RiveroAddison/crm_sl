// filepath: src/services/offlineQueue.ts
import { visitasApi } from './visitas.api';

export async function syncPendingOperations(): Promise<void> {
  console.log('[OfflineQueue] Iniciando sincronización de operaciones pendientes...');
  try {
    const pending = localStorage.getItem('pending_checkins');
    if (pending) {
      const checkins = JSON.parse(pending);
      if (Array.isArray(checkins) && checkins.length > 0) {
        for (const item of checkins) {
          try {
            await visitasApi.checkIn(item);
          } catch (err) {
            console.error('[OfflineQueue] Error sincronizando check-in individual:', err);
          }
        }
        localStorage.removeItem('pending_checkins');
        console.log('[OfflineQueue] Check-ins pendientes sincronizados con éxito.');
      }
    }
  } catch (err) {
    console.error('[OfflineQueue] Error general en syncPendingOperations:', err);
    throw err;
  }
}
