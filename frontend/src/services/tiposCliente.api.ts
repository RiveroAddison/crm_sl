import { http } from './http';
import type { TipoCliente } from '../domain/lead';

export const tiposClienteApi = {
  async list(): Promise<TipoCliente[]> {
    const { data } = await http.get<{ success: boolean; data: TipoCliente[] }>('/api/tipos-cliente');
    return data.data;
  },

  async create(input: { nombre: string }): Promise<TipoCliente> {
    const { data } = await http.post<{ success: boolean; data: TipoCliente }>('/api/tipos-cliente', input);
    return data.data;
  },

  async update(id: string, input: { nombre?: string; activo?: boolean }): Promise<TipoCliente> {
    const { data } = await http.patch<{ success: boolean; data: TipoCliente }>(`/api/tipos-cliente/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<{ id: string }> {
    const { data } = await http.delete<{ success: boolean; data: { id: string } }>(`/api/tipos-cliente/${id}`);
    return data.data;
  },
};
