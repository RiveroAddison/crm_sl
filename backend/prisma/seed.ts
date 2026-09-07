import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la creación del seed...');

  // SQLite no soporta TRUNCATE; se eliminan todas las filas respetando las FK.
  await prisma.$transaction([
    prisma.detallePedido.deleteMany(),
    prisma.pedido.deleteMany(),
    prisma.visitaCliente.deleteMany(),
    prisma.ventaCliente.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.oportunidad.deleteMany(),
    prisma.cuentaComercial.deleteMany(),
    prisma.crossSellingMatriz.deleteMany(),
    prisma.clienteEmpresa.deleteMany(),
    prisma.clienteCorporativo.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.usuarioEmpresa.deleteMany(),
    prisma.usuario.deleteMany(),
    prisma.empresa.deleteMany(),
  ]);

  // 1. Encriptar la contraseña del usuario master.
  const hashedPassword = await bcrypt.hash('admin1234', 10);

  // 2. Crear la única empresa del seed.
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'San Luis',
      rif: 'J-30533405-6',
      rubro: 'Combustible',
      profitDbHost: 'SRVBDPROFITBK',
      profitDbName: 'AD_DIST',
      profitDbUser: 'solicitudweb',
      profitDbPassword: 'solicitudweb',
      activo: true,
    },
  });

  // 3. Crear el único usuario del seed.
  const usuarioMaster = await prisma.usuario.create({
    data: {
      nombre: 'Master',
      email: 'master@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  // 4. Asociar el usuario master a la empresa.
  await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usuarioMaster.id,
      empresaId: empresa.id,
      rol: 'MASTER',
    },
  });

  // 5. Crear tipos de cliente predefinidos para la empresa.
  const tiposCliente = [
    { nombre: 'Corporativo', activo: true },
    { nombre: 'Gobierno', activo: true },
    { nombre: 'PYMES', activo: true },
    { nombre: 'Particular', activo: true },
    { nombre: 'ONG', activo: true },
    { nombre: 'Internacional', activo: true },
    { nombre: 'Distribuidor', activo: true },
    { nombre: 'Minorista', activo: true },
    { nombre: 'Mayorista', activo: true },
  ];

  for (const tipo of tiposCliente) {
    await prisma.tipoCliente.upsert({
      where: {
        empresaId_nombre: {
          empresaId: empresa.id,
          nombre: tipo.nombre
        }
      },
      update: {},
      create: {
        empresaId: empresa.id,
        nombre: tipo.nombre,
        activo: tipo.activo
      }
    });
  }

  console.log('✅ Seed completado con éxito:');
  console.log(`- Master: ${usuarioMaster.email}`);
  console.log(`- Empresa creada y asociada: ${empresa.nombre}`);
  console.log(`- Rubro: ${empresa.rubro}`);
  console.log(`- Tipos de cliente creados: ${tiposCliente.length}`);
  console.log('- Rol: MASTER');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });