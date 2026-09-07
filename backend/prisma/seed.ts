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

  // 5. Crear usuario Admin de prueba.
  const usuarioAdmin = await prisma.usuario.create({
    data: {
      nombre: 'Admin San Luis',
      email: 'admin@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usuarioAdmin.id,
      empresaId: empresa.id,
      rol: 'ADMIN',
    },
  });

  // 6. Crear usuario Vendedor de prueba.
  const usuarioVendedor = await prisma.usuario.create({
    data: {
      nombre: 'Vendedor Test',
      email: 'vendedor@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usuarioVendedor.id,
      empresaId: empresa.id,
      rol: 'VENDEDOR',
    },
  });

  console.log('✅ Seed completado con éxito:');
  console.log(`- Master: ${usuarioMaster.email} (contraseña: admin1234)`);
  console.log(`- Admin: ${usuarioAdmin.email} (contraseña: admin1234)`);
  console.log(`- Vendedor: ${usuarioVendedor.email} (contraseña: admin1234)`);
  console.log(`- Empresa: ${empresa.nombre}`);
  console.log(`- Rubro: ${empresa.rubro}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });