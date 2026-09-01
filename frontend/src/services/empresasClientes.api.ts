// filepath: src/services/empresasClientes.api.ts
import { http } from './http';
import {
  EmpresaClienteInputSchema,
  EmpresaClienteListResponseSchema,
  EmpresaClienteResponseSchema,
  EmpresaClienteDeleteResponseSchema,
  type EmpresaClienteInput,
} from '../domain/empresaCliente';

export const empresasClientesApi = {
  async list() {
    const { data } = await http.get('/api/empresas-clientes');
    return EmpresaClienteListResponseSchema.parse(data).data;
  },

  async get(id: string) {
    const { data } = await http.get(`/api/empresas-clientes/${id}`);
    return EmpresaClienteResponseSchema.parse(data).data;
  },

  async create(input: EmpresaClienteInput) {
    const body = EmpresaClienteInputSchema.parse(input);
    const { data } = await http.post('/api/empresas-clientes', body);
    return EmpresaClienteResponseSchema.parse(data).data;
  },

  async update(id: string, input: EmpresaClienteInput) {
    const body = EmpresaClienteInputSchema.parse(input);
    const { data } = await http.put(`/api/empresas-clientes/${id}`, body);
    return EmpresaClienteResponseSchema.parse(data).data;
  },

  async remove(id: string) {
    const { data } = await http.delete(`/api/empresas-clientes/${id}`);
    return EmpresaClienteDeleteResponseSchema.parse(data).data;
  },
};
