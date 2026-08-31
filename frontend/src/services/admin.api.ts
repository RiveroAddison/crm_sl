// filepath: src/services/admin.api.ts
import { http } from './http';
import {
  UsuarioInputSchema,
  UsuarioUpdateInputSchema,
  EmpresaInputSchema,
  TestConexionInputSchema,
  UsuarioListResponseSchema,
  UsuarioResponseSchema,
  EmpresaListResponseSchema,
  EmpresaResponseSchema,
  EmpresaDeleteResponseSchema,
  TestConexionResponseSchema,
  type Usuario,
  type UsuarioInput,
  type UsuarioUpdateInput,
  type Empresa,
  type EmpresaInput,
  type TestConexionInput,
} from '../domain/usuario';

export const usuariosApi = {
  async list(): Promise<Usuario[]> {
    const { data } = await http.get('/api/usuarios');
    return UsuarioListResponseSchema.parse(data).data;
  },

  async get(id: string): Promise<Usuario> {
    const { data } = await http.get(`/api/usuarios/${id}`);
    return UsuarioResponseSchema.parse(data).data;
  },

  async create(input: UsuarioInput): Promise<Usuario> {
    const body = UsuarioInputSchema.parse(input);
    const { data } = await http.post('/api/usuarios', body);
    return UsuarioResponseSchema.parse(data).data;
  },

  async update(id: string, input: UsuarioUpdateInput): Promise<Usuario> {
    const body = UsuarioUpdateInputSchema.parse(input);
    const { data } = await http.put(`/api/usuarios/${id}`, body);
    return UsuarioResponseSchema.parse(data).data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/api/usuarios/${id}`);
  },
};

export const empresasApi = {
  async list(): Promise<Empresa[]> {
    const { data } = await http.get('/api/empresas');
    return EmpresaListResponseSchema.parse(data).data;
  },

  async get(id: string): Promise<Empresa> {
    const { data } = await http.get(`/api/empresas/${id}`);
    return EmpresaResponseSchema.parse(data).data;
  },

  async create(input: EmpresaInput): Promise<Empresa> {
    const body = EmpresaInputSchema.parse(input);
    const { data } = await http.post('/api/empresas', body);
    return EmpresaResponseSchema.parse(data).data;
  },

  async update(id: string, input: EmpresaInput): Promise<Empresa> {
    const body = EmpresaInputSchema.parse(input);
    const { data } = await http.put(`/api/empresas/${id}`, body);
    return EmpresaResponseSchema.parse(data).data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await http.delete(`/api/empresas/${id}`);
    return EmpresaDeleteResponseSchema.parse(data).data;
  },

  async testConnection(input: TestConexionInput) {
    const body = TestConexionInputSchema.parse(input);
    const { data } = await http.post('/api/empresas/test-connection', body);
    return TestConexionResponseSchema.parse(data).data;
  },
};
