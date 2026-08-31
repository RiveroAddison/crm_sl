import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la creación de datos de prueba (Seed)...');

  // 1. Limpiar datos previos si existen (opcional)
  await prisma.usuarioEmpresa.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.empresa.deleteMany({});

  // 2. Encriptar contraseña para los usuarios
  const hashedPassword = await bcrypt.hash('admin1234', 10);

  // 3. Crear el Usuario Master (Administrador)
  const usuarioMaster = await prisma.usuario.create({
    data: {
      nombre: 'Usuario Master',
      email: 'master@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  // 4. Crear los 2 Vendedores de prueba
  const vendedor1 = await prisma.usuario.create({
    data: {
      nombre: 'Carlos Pérez',
      email: 'cperez@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  const vendedor2 = await prisma.usuario.create({
    data: {
      nombre: 'María González',
      email: 'mgonzalez@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  // 5. Crear las 2 Empresas internas
  const empresaCombustible = await prisma.empresa.create({
    data: {
      nombre: 'San Luis Combustible',
      activo: true,
    },
  });

  const empresaLubricantes = await prisma.empresa.create({
    data: {
      nombre: 'San Luis Lubricantes',
      activo: true,
    },
  });

  // 6. Asociar el Usuario Master a ambas Empresas con rol ADMIN
  await prisma.usuarioEmpresa.createMany({
    data: [
      {
        usuarioId: usuarioMaster.id,
        empresaId: empresaCombustible.id,
        rol: 'ADMIN',
      },
      {
        usuarioId: usuarioMaster.id,
        empresaId: empresaLubricantes.id,
        rol: 'ADMIN',
      },
    ],
  });

  // 7. Asociar los Vendedores a las Empresas con rol VENDEDOR
  await prisma.usuarioEmpresa.createMany({
    data: [
      {
        usuarioId: vendedor1.id,
        empresaId: empresaCombustible.id,
        rol: 'VENDEDOR',
      },
      {
        usuarioId: vendedor2.id,
        empresaId: empresaLubricantes.id,
        rol: 'VENDEDOR',
      },
    ],
  });

  console.log('✅ Seed completado con éxito:');
  console.log(`- Master: ${usuarioMaster.email}`);
  console.log(`- Vendedor 1: ${vendedor1.email}`);
  console.log(`- Vendedor 2: ${vendedor2.email}`);
  console.log(`- Empresas creadas y asociadas: ${empresaCombustible.nombre}, ${empresaLubricantes.nombre}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });