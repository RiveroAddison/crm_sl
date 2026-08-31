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
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  activo: z.boolean().default(true),
  empresas: z.array(usuarioEmpresaSchema).default([])
});

const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
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

    const { nombre, email, password, activo, empresas } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.usuario.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ success: false, data: null, error: 'El correo electrónico ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre,
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

    const { nombre, email, password, activo, empresas } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

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

    const dataToUpdate: any = {
      nombre,
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

    return res.json({
      success: true,
      data: { id, nombre, email: normalizedEmail, activo },
      error: ''
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({ success: false, data: null, error: 'Error al actualizar usuario' });
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

