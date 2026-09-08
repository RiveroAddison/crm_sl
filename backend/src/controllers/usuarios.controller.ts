import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getMasterOrAdminContext } from '../middleware/auth.js';

const usuarioEmpresaSchema = z.object({
  empresaId: z.string().uuid(),
  rol: z.enum(['MASTER', 'ADMIN', 'VENDEDOR'])
});

const createUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  usuario: z.string().min(1).max(100),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  activo: z.boolean().default(true),
  empresas: z.array(usuarioEmpresaSchema).default([])
});

const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  usuario: z.string().min(1).max(100),
  email: z.string().email().max(100),
  password: z.string().max(100).optional().nullable(),
  activo: z.boolean(),
  empresas: z.array(usuarioEmpresaSchema).default([])
});

export async function list(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado para gestionar usuarios' });
    }

    const usuarios = await prisma.usuario.findMany({
      include: {
        usuarioEmpresas: {
          include: {
            empresa: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return res.json({
      success: true,
      data: usuarios.map(u => ({
        id: u.id,
        nombre: u.nombre,
        usuario: u.usuario,
        email: u.email,
        activo: u.activo,
        createdAt: u.createdAt,
        empresas: u.usuarioEmpresas.map(ue => ({
          empresaId: ue.empresaId,
          empresaNombre: ue.empresa.nombre,
          rol: ue.rol,
          activo: ue.activo
        }))
      })),
      error: ''
    });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al listar usuarios' });
  }
}

export async function get(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const id = req.params.id as string;
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        usuarioEmpresas: {
          include: { empresa: true }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ success: false, data: null, error: 'Usuario no encontrado' });
    }

    return res.json({
      success: true,
      data: {
        id: usuario.id,
        nombre: usuario.nombre,
        usuario: usuario.usuario,
        email: usuario.email,
        activo: usuario.activo,
        empresas: usuario.usuarioEmpresas.map(ue => ({
          empresaId: ue.empresaId,
          empresaNombre: ue.empresa.nombre,
          rol: ue.rol,
          activo: ue.activo
        }))
      },
      error: ''
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al obtener usuario' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const parsed = createUsuarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, data: null, error: 'Datos de entrada inválidos', details: parsed.error.format() });
    }

    const { nombre, usuario, email, password, activo, empresas } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsuario = usuario.trim();

    const existing = await prisma.usuario.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ success: false, data: null, error: 'El correo electrónico ya está registrado' });
    }

    const existingUsuario = await prisma.usuario.findUnique({ where: { usuario: normalizedUsuario } });
    if (existingUsuario) {
      return res.status(400).json({ success: false, data: null, error: 'El nombre de usuario ya está registrado' });
    }

    // ADMIN y VENDEDOR solo pueden tener 1 empresa
    const hasSingleRole = empresas.some(e => e.rol === 'ADMIN' || e.rol === 'VENDEDOR');
    if (hasSingleRole && empresas.length > 1) {
      return res.status(400).json({ success: false, data: null, error: 'Los usuarios ADMIN y VENDEDOR solo pueden estar asignados a una empresa' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre,
          usuario: normalizedUsuario,
          email: normalizedEmail,
          password: passwordHash,
          activo
        }
      });

      if (empresas.length > 0) {
        await tx.usuarioEmpresa.createMany({
          data: empresas.map(emp => ({
            usuarioId: user.id,
            empresaId: emp.empresaId,
            rol: emp.rol,
            activo: true
          }))
        });
      }

      return user;
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        nombre: newUser.nombre,
        usuario: newUser.usuario,
        email: newUser.email,
        activo: newUser.activo
      },
      error: ''
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al crear usuario' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const id = req.params.id as string;
    const parsed = updateUsuarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, data: null, error: 'Datos de entrada inválidos' });
    }

    const { nombre, usuario, email, password, activo, empresas } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsuario = usuario.trim();

    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, data: null, error: 'Usuario no encontrado' });
    }

    const existingEmail = await prisma.usuario.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: id }
      }
    });
    if (existingEmail) {
      return res.status(400).json({ success: false, data: null, error: 'El correo electrónico ya está registrado por otro usuario' });
    }

    const existingUsuario = await prisma.usuario.findFirst({
      where: {
        usuario: normalizedUsuario,
        id: { not: id }
      }
    });
    if (existingUsuario) {
      return res.status(400).json({ success: false, data: null, error: 'El nombre de usuario ya está registrado por otro usuario' });
    }

    // ADMIN y VENDEDOR solo pueden tener 1 empresa
    const hasSingleRole = empresas.some(e => e.rol === 'ADMIN' || e.rol === 'VENDEDOR');
    if (hasSingleRole && empresas.length > 1) {
      return res.status(400).json({ success: false, data: null, error: 'Los usuarios ADMIN y VENDEDOR solo pueden estar asignados a una empresa' });
    }

    const dataToUpdate: any = {
      nombre,
      usuario: normalizedUsuario,
      email: normalizedEmail,
      activo
    };

    if (password && password.trim().length >= 6) {
      dataToUpdate.password = await bcrypt.hash(password, 12);
    }

    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id },
        data: dataToUpdate
      });

      // Sincronizar asignaciones de empresas
      await tx.usuarioEmpresa.deleteMany({
        where: { usuarioId: id }
      });

      if (empresas.length > 0) {
        await tx.usuarioEmpresa.createMany({
          data: empresas.map(emp => ({
            usuarioId: id,
            empresaId: emp.empresaId,
            rol: emp.rol,
            activo: true
          }))
        });
      }
    });

    // Reconstruir la lista de empresas del usuario
    const usuarioEmpresas = await prisma.usuarioEmpresa.findMany({
      where: { usuarioId: id },
      include: { empresa: true }
    });

    return res.json({
      success: true,
      data: {
        id,
        nombre,
        usuario: normalizedUsuario,
        email: normalizedEmail,
        activo,
        empresas: usuarioEmpresas.map(ue => ({
          empresaId: ue.empresaId,
          empresaNombre: ue.empresa.nombre,
          rol: ue.rol,
          activo: ue.activo
        }))
      },
      error: ''
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al actualizar usuario' });
  }
}

export async function listVendedoresByEmpresa(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const { empresaId } = req.query;
    if (!empresaId || typeof empresaId !== 'string') {
      return res.status(400).json({ success: false, data: null, error: 'empresaId es requerido' });
    }

    const vendedores = await prisma.usuarioEmpresa.findMany({
      where: {
        empresaId,
        rol: 'VENDEDOR',
        activo: true,
        usuario: { activo: true }
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, usuario: true, email: true }
        }
      },
      orderBy: { usuario: { nombre: 'asc' } }
    });

    return res.json({
      success: true,
      data: vendedores.map(ve => ({
        id: ve.usuario.id,
        nombre: ve.usuario.nombre,
        usuario: ve.usuario.usuario,
        email: ve.usuario.email
      })),
      error: ''
    });
  } catch (error) {
    console.error('Error al listar vendedores por empresa:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al listar vendedores' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const context = await getMasterOrAdminContext(req);
    if (!context) {
      return res.status(403).json({ success: false, data: null, error: 'No autorizado' });
    }

    const id = req.params.id as string;
    if (context.userId === id) {
      return res.status(400).json({ success: false, data: null, error: 'No puede eliminarse a sí mismo' });
    }

    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, data: null, error: 'Usuario no encontrado' });
    }

    // Al tener onDelete: Cascade en schema.prisma, eliminar el usuario eliminará también sus UsuarioEmpresa
    await prisma.usuario.delete({ where: { id } });

    return res.json({
      success: true,
      data: { message: 'Usuario eliminado exitosamente' },
      error: ''
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    // Si falla por otras restricciones de llaves foráneas, podemos deactivarlo en su lugar
    try {
      const id = req.params.id as string;
      await prisma.usuario.update({
        where: { id },
        data: { activo: false }
      });
      return res.json({
        success: true,
        data: { message: 'El usuario no pudo ser eliminado físicamente debido a registros asociados, pero ha sido desactivado exitosamente.' },
        error: ''
      });
    } catch (innerError) {
      return res.status(500).json({ success: false, data: null, error: 'Error al desactivar el usuario' });
    }
  }
}

