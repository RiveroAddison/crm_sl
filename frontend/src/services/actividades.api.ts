import { http } from './http';
import type { ActividadLead, CreateActividadInput } from '../domain/lead';

export const actividadesApi = {
  list: (leadId: string) =>
    http.get<{ success: boolean; data: ActividadLead[] }>(`/leads/${leadId}/actividades`),

  create: (leadId: string, input: CreateActividadInput) =>
    http.post<{ success: boolean; data: ActividadLead }>(`/leads/${leadId}/actividades`, input),
};
