// filepath: src/services/leads.api.ts
import { http } from './http';
import { cache } from './cache';
import {
  LeadInputSchema,
  LeadPatchSchema,
  LeadListResponseSchema,
  LeadResponseSchema,
  LeadDeleteResponseSchema,
  LeadConvertResponseSchema,
  AprobarLeadInputSchema,
  RechazarLeadInputSchema,
  type Lead,
  type LeadInput,
  type LeadPatch,
  type AprobarLeadInput,
  type RechazarLeadInput,
} from '../domain/lead';

export const leadsApi = {
  async list(): Promise<Lead[]> {
    try {
      const { data } = await http.get('/api/leads');
      const parsed = LeadListResponseSchema.parse(data).data;
      await cache.leads.setAll(parsed);
      return parsed;
    } catch (err) {
      const cached = (await cache.leads.getAll()) as Lead[];
      if (cached.length > 0) return cached;
      throw err;
    }
  },

  async fromCache(): Promise<Lead[]> {
    return (await cache.leads.getAll()) as Lead[];
  },

  async create(input: LeadInput): Promise<Lead> {
    const body = LeadInputSchema.parse(input);
    const { data } = await http.post('/api/leads', body);
    return LeadResponseSchema.parse(data).data;
  },

  async update(id: string, input: LeadPatch): Promise<Lead> {
    const body = LeadPatchSchema.parse(input);
    const { data } = await http.patch(`/api/leads/${id}`, body);
    return LeadResponseSchema.parse(data).data;
  },

  async remove(id: string): Promise<{ id: string }> {
    const { data } = await http.delete(`/api/leads/${id}`);
    return LeadDeleteResponseSchema.parse(data).data;
  },

  async convert(id: string) {
    const { data } = await http.post(`/api/leads/${id}/convert`);
    return LeadConvertResponseSchema.parse(data).data;
  },

  async aprobar(id: string, input: AprobarLeadInput) {
    const body = AprobarLeadInputSchema.parse(input);
    const { data } = await http.post(`/api/leads/${id}/aprobar`, body);
    return data;
  },

  async rechazar(id: string, input: RechazarLeadInput) {
    const body = RechazarLeadInputSchema.parse(input);
    const { data } = await http.post(`/api/leads/${id}/rechazar`, body);
    return data;
  },

  async getRechazos(id: string) {
    const { data } = await http.get(`/api/leads/${id}/rechazos`);
    return data;
  },
};
