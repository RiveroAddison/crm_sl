// filepath: src/services/empresasClientes.api.ts
import { http } from './http';
import {
  CuentaComercialInputSchema,
  CuentaComercialListResponseSchema,
  CuentaComercialResponseSchema,
  EmpresaClienteDeleteResponseSchema,
  type CuentaComercialInput,
} from '../domain/empresaCliente';

export const cuentasComercialesApi = {
  async list() {
    const { data } = await http.get('/api/empresas-clientes');
    return CuentaComercialListResponseSchema.parse(data).data;
  },

  async get(id: string) {
    const { data } = await http.get(`/api/empresas-clientes/${id}`);
    return CuentaComercialResponseSchema.parse(data).data;
  },

  async create(input: CuentaComercialInput) {
    const body = CuentaComercialInputSchema.parse(input);
    const { data } = await http.post('/api/empresas-clientes', body);
    return CuentaComercialResponseSchema.parse(data).data;
  },

  async update(id: string, input: CuentaComercialInput) {
    const body = CuentaComercialInputSchema.parse(input);
    const { data } = await http.put(`/api/empresas-clientes/${id}`, body);
    return CuentaComercialResponseSchema.parse(data).data;
  },

  async remove(id: string) {
    const { data } = await http.delete(`/api/empresas-clientes/${id}`);
    return EmpresaClienteDeleteResponseSchema.parse(data).data;
  },
};

export const empresasClientesApi = cuentasComercialesApi;
