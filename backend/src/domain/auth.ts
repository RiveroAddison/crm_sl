import { z } from 'zod';

export const EmpresaAuthSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1)
});

export const UsuarioAuthSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  email: z.string().email(),
  rolGlobal: z.enum(['MASTER', 'ADMIN', 'VENDEDOR'])
});

export const Paso1LoginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    preAuthToken: z.string().min(1),
    user: UsuarioAuthSchema,
    empresasAsignadas: z.array(EmpresaAuthSchema)
  }),
  error: z.string()
});

export const Paso2SelectEmpresaSchema = z.object({
  empresaId: z.string().uuid()
});

export const Paso2LoginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    token: z.string().min(1),
    tenantId: z.string().uuid(),
    empresa: EmpresaAuthSchema,
    rol: z.enum(['MASTER', 'ADMIN', 'VENDEDOR'])
  }),
  error: z.string()
});

export type EmpresaAuth = z.infer<typeof EmpresaAuthSchema>;
export type UsuarioAuth = z.infer<typeof UsuarioAuthSchema>;
export type Paso1LoginResponse = z.infer<typeof Paso1LoginResponseSchema>;
export type Paso2SelectEmpresa = z.infer<typeof Paso2SelectEmpresaSchema>;
export type Paso2LoginResponse = z.infer<typeof Paso2LoginResponseSchema>;
export type SesionAuth = Paso2LoginResponse['data'];
