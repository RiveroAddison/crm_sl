// filepath: src/services/prospectos.api.ts
import { http } from './http';
import { cache } from './cache';
import {
  CrearOportunidadSchema,
  UpdateEtapaInputSchema,
  OportunidadListResponseSchema,
  OportunidadResponseSchema,
  OportunidadDeleteResponseSchema,
  type Oportunidad,
  type CrearOportunidadForm,
  type EtapaOportunidad,
} from '../domain/prospecto';

export const prospectosApi = {
  async list(): Promise<Oportunidad[]> {
    try {
      const { data } = await http.get('/api/prospectos');
      const parsed = OportunidadListResponseSchema.parse(data).data;
      await cache.prospectos.setAll(parsed);
      return parsed;
    } catch (err) {
      const cached = (await cache.prospectos.getAll()) as Oportunidad[];
      if (cached.length > 0) return cached;
      throw err;
    }
  },

  async fromCache(): Promise<Oportunidad[]> {
    return (await cache.prospectos.getAll()) as Oportunidad[];
  },

  async create(input: CrearOportunidadForm): Promise<Oportunidad> {
    const body = CrearOportunidadSchema.parse(input);
    const { data } = await http.post('/api/prospectos', body);
    return OportunidadResponseSchema.parse(data).data;
  },

  async updateStage(id: string, etapa: EtapaOportunidad): Promise<Oportunidad> {
    const body = UpdateEtapaInputSchema.parse({ etapa });
    const { data } = await http.patch(`/api/prospectos/${id}/etapa`, body);
    return OportunidadResponseSchema.parse(data).data;
  },

  async remove(id: string): Promise<{ id: string }> {
    const { data } = await http.delete(`/api/prospectos/${id}`);
    return OportunidadDeleteResponseSchema.parse(data).data;
  },
};
