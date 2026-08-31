// filepath: src/services/dashboard.api.ts
import { http } from './http';
import { cache } from './cache';
import { DashboardResponseSchema, type DashboardData } from '../domain/dashboard';

export const dashboardApi = {
  /** Carga el dashboard. Si la red falla, devuelve el cache. */
  async load(): Promise<DashboardData> {
    try {
      const { data } = await http.get('/api/dashboard');
      const parsed = DashboardResponseSchema.parse(data).data;
      await cache.dashboard.set(parsed);
      return parsed;
    } catch (err) {
      const cached = await cache.dashboard.get();
      if (cached) return cached as DashboardData;
      throw err;
    }
  },

  /** Solo cache, sin red. */
  async fromCache(): Promise<DashboardData | undefined> {
    return (await cache.dashboard.get()) as DashboardData | undefined;
  },
};
