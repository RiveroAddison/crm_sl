import { http } from './http';
import type { ActividadOportunidad, CreateActividadOportunidadInput } from '../domain/prospecto';

export const actividadesOportunidadesApi = {
  async list(oportunidadId: string): Promise<ActividadOportunidad[]> {
    const { data } = await http.get<{ success: boolean; data: ActividadOportunidad[] }>(`/api/prospectos/${oportunidadId}/actividades`);
    return data.data;
  },

  async create(oportunidadId: string, input: CreateActividadOportunidadInput): Promise<ActividadOportunidad> {
    const { data } = await http.post<{ success: boolean; data: ActividadOportunidad }>(`/api/prospectos/${oportunidadId}/actividades`, input);
    return data.data;
  },
};
