// filepath: src/domain/auth.ts
import { z } from 'zod';
import { ApiEnvelopeSchema, RolSchema, UuidSchema } from './api';

export { RolSchema };
export type { Rol } from './api';

export const EmpresaAuthSchema = z.object({
  id: UuidSchema,
  nombre: z.string().min(1),
  rubro: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
});
export type EmpresaAuth = z.infer<typeof EmpresaAuthSchema>;

export const UsuarioAuthSchema = z.object({
  id: UuidSchema,
  nombre: z.string().min(1),
  email: z.string().email(),
  rolGlobal: RolSchema,
});
export type UsuarioAuth = z.infer<typeof UsuarioAuthSchema>;

/** --- Paso 1: login (email + password) --- */
export const LoginInputSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(1).max(100),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const Paso1LoginDataSchema = z.object({
  preAuthToken: z.string().min(1),
  user: UsuarioAuthSchema,
  empresasAsignadas: z.array(EmpresaAuthSchema),
});
export const Paso1LoginResponseSchema = ApiEnvelopeSchema(Paso1LoginDataSchema);
export type Paso1LoginData = z.infer<typeof Paso1LoginDataSchema>;
export type Paso1LoginResponse = z.infer<typeof Paso1LoginResponseSchema>;

/** --- Paso 2: seleccion de empresa --- */
export const SelectEmpresaInputSchema = z.object({
  empresaId: UuidSchema,
});
export type SelectEmpresaInput = z.infer<typeof SelectEmpresaInputSchema>;

export const Paso2LoginDataSchema = z.object({
  token: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tenantId: UuidSchema,
  empresa: EmpresaAuthSchema,
  rol: RolSchema,
});
export const Paso2LoginResponseSchema = ApiEnvelopeSchema(Paso2LoginDataSchema);
export type Paso2LoginData = z.infer<typeof Paso2LoginDataSchema>;
export type Paso2LoginResponse = z.infer<typeof Paso2LoginResponseSchema>;

/** --- /me --- */
export const MeDataSchema = z.object({
  token: z.string().optional(),
  user: UsuarioAuthSchema,
  tenantId: UuidSchema,
  tenantNombre: z.string(),
  empresa: EmpresaAuthSchema,
  rol: RolSchema,
});
export const MeResponseSchema = ApiEnvelopeSchema(MeDataSchema);
export type MeData = z.infer<typeof MeDataSchema>;

/** --- /refresh --- */
export const RefreshDataSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  token: z.string().min(1),
  tenantId: UuidSchema,
  rol: RolSchema,
});
export const RefreshResponseSchema = ApiEnvelopeSchema(RefreshDataSchema);
export type RefreshData = z.infer<typeof RefreshDataSchema>;

/** --- /logout --- */
export const LogoutDataSchema = z.object({ message: z.string() });
export const LogoutResponseSchema = ApiEnvelopeSchema(LogoutDataSchema);
