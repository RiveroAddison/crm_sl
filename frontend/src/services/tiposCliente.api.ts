import { http } from './http';
import type { TipoCliente } from '../domain/lead';

export const tiposClienteApi = {
  list: () =>
    http.get<{ success: boolean; data: TipoCliente[] }>('/tipos-cliente'),

  create: (input: { nombre: string }) =>
    http.post<{ success: boolean; data: TipoCliente }>('/tipos-cliente', input),

  update: (id: string, input: { nombre?: string; activo?: boolean }) =>
    http.patch<{ success: boolean; data: TipoCliente }>(`/tipos-cliente/${id}`, input),

  remove: (id: string) =>
    http.delete<{ success: boolean; data: { id: string } }>(`/tipos-cliente/${id}`),
};
