// filepath: src/services/profit.api.ts
import { http } from './http';
import {
  ProfitSyncInputSchema,
  ProfitSyncClientesResponseSchema,
  ProfitSyncVentasResponseSchema,
  ProfitSyncAllResponseSchema,
  ProfitStatusResponseSchema,
  type ProfitSyncInput,
  type ProfitStatus,
  type ProfitSyncResult,
} from '../domain/usuario';

export const profitApi = {
  async syncClientes(input: ProfitSyncInput = {}): Promise<{ message: string; results: ProfitSyncResult[] }> {
    const body = ProfitSyncInputSchema.parse(input);
    const { data } = await http.post('/api/profit/sync/clientes', body);
    return ProfitSyncClientesResponseSchema.parse(data).data;
  },

  async syncVentas(input: ProfitSyncInput = {}): Promise<{ message: string; results: ProfitSyncResult[] }> {
    const body = ProfitSyncInputSchema.parse(input);
    const { data } = await http.post('/api/profit/sync/ventas', body);
    return ProfitSyncVentasResponseSchema.parse(data).data;
  },

  async syncAll(input: ProfitSyncInput = {}): Promise<{
    message: string;
    clientes: ProfitSyncResult[];
    ventas: ProfitSyncResult[];
  }> {
    const body = ProfitSyncInputSchema.parse(input);
    const { data } = await http.post('/api/profit/sync/all', body);
    return ProfitSyncAllResponseSchema.parse(data).data;
  },

  async status(): Promise<ProfitStatus[]> {
    const { data } = await http.get('/api/profit/status');
    return ProfitStatusResponseSchema.parse(data).data;
  },
};
