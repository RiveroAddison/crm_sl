// filepath: src/services/pedidos.api.ts
import { http } from './http';
import { cache } from './cache';
import {
  CreatePedidoInputSchema,
  UpdatePedidoEstadoInputSchema,
  PedidoListResponseSchema,
  PedidoResponseSchema,
  type Pedido,
  type CreatePedidoInput,
  type PedidoEstado,
} from '../domain/pedido';

export const pedidosApi = {
  async list(): Promise<Pedido[]> {
    try {
      const { data } = await http.get('/api/pedidos');
      const parsed = PedidoListResponseSchema.parse(data).data;
      await cache.pedidos.setAll(parsed);
      return parsed;
    } catch (err) {
      const cached = (await cache.pedidos.getAll()) as Pedido[];
      if (cached.length > 0) return cached;
      throw err;
    }
  },

  async fromCache(): Promise<Pedido[]> {
    return (await cache.pedidos.getAll()) as Pedido[];
  },

  async create(input: CreatePedidoInput): Promise<Pedido> {
    const body = CreatePedidoInputSchema.parse(input);
    const { data } = await http.post('/api/pedidos', body);
    return PedidoResponseSchema.parse(data).data;
  },

  async updateStatus(id: string, estado: PedidoEstado): Promise<Pedido> {
    const body = UpdatePedidoEstadoInputSchema.parse({ estado });
    const { data } = await http.patch(`/api/pedidos/${id}/estado`, body);
    return PedidoResponseSchema.parse(data).data;
  },
};
