// filepath: src/services/auth.api.ts
import { http } from './http';
import {
  LoginInputSchema,
  SelectEmpresaInputSchema,
  type LoginInput,
  type SelectEmpresaInput,
  type MeData,
  MeResponseSchema,
  Paso1LoginResponseSchema,
  Paso2LoginResponseSchema,
  RefreshResponseSchema,
  LogoutResponseSchema,
} from '../domain/auth';

export const authApi = {
  /** Paso 1 del login: email + password -> preAuthToken + empresas. */
  async login(input: LoginInput) {
    const body = LoginInputSchema.parse(input);
    const { data } = await http.post('/api/auth/login', body, { _skipRefresh: true });
    return Paso1LoginResponseSchema.parse(data);
  },

  /** Paso 2: elige empresa y obtiene access + refresh tokens. */
  async selectEmpresa(input: SelectEmpresaInput, preAuthToken: string) {
    const body = SelectEmpresaInputSchema.parse(input);
    const { data } = await http.post('/api/auth/context', body, {
      headers: { Authorization: `Bearer ${preAuthToken}` },
      _skipRefresh: true,
    });
    console.log(data)
    return Paso2LoginResponseSchema.parse(data);
  },

  /** Sesion actual (cookie httpOnly adjunta). Devuelve null si no hay sesion. */
  async me(): Promise<MeData | null> {
    try {
      const { data } = await http.get('/api/auth/me');
      return MeResponseSchema.parse(data).data;
    } catch (err) {
      // 401 = no autenticado; el resto de errores se propaga
      if ((err as { status?: number })?.status === 401) return null;
      throw err;
    }
  },

  /** Renueva tokens (tambien llamado por el interceptor de axios). */
  async refresh() {
    const { data } = await http.post('/api/auth/refresh', {}, { _skipRefresh: true });
    return RefreshResponseSchema.parse(data);
  },

  /** Cierra la sesion (revoca familia de refresh + limpia cookies). */
  async logout(refreshToken?: string) {
    const { data } = await http.post('/api/auth/logout', { refreshToken }, { _skipRefresh: true });
    return LogoutResponseSchema.parse(data);
  },
};
