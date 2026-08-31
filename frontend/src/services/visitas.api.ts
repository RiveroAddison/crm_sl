// filepath: src/services/visitas.api.ts
import { http } from './http';
import { cache } from './cache';
import {
  CheckInInputSchema,
  VisitaListResponseSchema,
  VisitaResponseSchema,
  type VisitaGps,
  type CheckInInput,
} from '../domain/visita';

export const visitasApi = {
  async list(): Promise<VisitaGps[]> {
    try {
      const { data } = await http.get('/api/visitas');
      const parsed = VisitaListResponseSchema.parse(data).data;
      await cache.visitas.setAll(parsed);
      return parsed;
    } catch (err) {
      const cached = (await cache.visitas.getAll()) as VisitaGps[];
      if (cached.length > 0) return cached;
      throw err;
    }
  },

  async fromCache(): Promise<VisitaGps[]> {
    return (await cache.visitas.getAll()) as VisitaGps[];
  },

  async checkIn(input: CheckInInput): Promise<VisitaGps> {
    const body = CheckInInputSchema.parse(input);
    const { data } = await http.post('/api/visitas/checkin', body);
    return VisitaResponseSchema.parse(data).data;
  },
};
