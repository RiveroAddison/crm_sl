import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la creación de datos de prueba (Seed)...');

  // 1. Limpiar todos los datos dependientes antes de recrear el catálogo base.
  await prisma.detallePedido.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.visitaCliente.deleteMany({});
  await prisma.ventaCliente.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.oportunidad.deleteMany({});
  await prisma.cuentaComercial.deleteMany({});
  await prisma.crossSellingMatriz.deleteMany({});
  await prisma.clienteEmpresa.deleteMany({});
  await prisma.clienteCorporativo.deleteMany({});
  await prisma.refreshToken.deleteMany({});
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
      rubro: 'Combustibles',
      direccion: 'Av. Principal, Edificio San Luis, Piso 2, Maracaibo',
      telefono: '+58 261-1234567',
      activo: true,
    },
  });

  const empresaLubricantes = await prisma.empresa.create({
    data: {
      nombre: 'San Luis Lubricantes',
      rubro: 'Lubricantes',
      direccion: 'Calle 5, Zona Industrial, Maracaibo',
      telefono: '+58 261-7654321',
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

  // 8. Cliente corporativo con historial de ventas de los últimos seis meses.
  const clienteCorporativo = await prisma.clienteCorporativo.create({
    data: {
      rif: 'J-12345678-9',
      razonSocial: 'Transporte Central C.A.',
      direccion: 'Av. Intercomunal, Maracaibo',
      telefono: '+58 414-5551234',
      matriz: true,
      crossSellingMatriz: {
        create: {
          combustible: 'COMPRA',
          lubricantes: 'COMPRA',
          autopartes: 'NA',
          transporte: 'COMPRA',
        },
      },
    },
  });

  const clientesEmpresa = await Promise.all([
    prisma.clienteEmpresa.create({
      data: {
        clienteCorporativoId: clienteCorporativo.id,
        empresaId: empresaCombustible.id,
        profitCodCli: 'CLI-0001',
        vendedor: vendedor1.nombre,
        vendedorId: vendedor1.id,
        estado: 'ACTIVO',
      },
    }),
    prisma.clienteEmpresa.create({
      data: {
        clienteCorporativoId: clienteCorporativo.id,
        empresaId: empresaLubricantes.id,
        profitCodCli: 'CLI-0002',
        vendedor: vendedor2.nombre,
        vendedorId: vendedor2.id,
        estado: 'ACTIVO',
      },
    }),
  ]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonth = new Date();
  const sales = clientesEmpresa.flatMap((client, clientIndex) => Array.from({ length: 6 }, (_, monthIndex) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (5 - monthIndex), 15);
    const amount = (clientIndex === 0 ? 18500 : 9200) + monthIndex * (clientIndex === 0 ? 750 : 420);
    return {
      clienteEmpresaId: client.id,
      mes: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
      semana: Math.ceil(date.getDate() / 7),
      fecha: date,
      documento: `FAC-${clientIndex + 1}${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
      unidades: (clientIndex === 0 ? 120 : 48) + monthIndex * (clientIndex === 0 ? 8 : 4),
      monto: amount,
    };
  }));
  await prisma.ventaCliente.createMany({ data: sales });

  console.log('✅ Seed completado con éxito:');
  console.log(`- Master: ${usuarioMaster.email}`);
  console.log(`- Vendedor 1: ${vendedor1.email}`);
  console.log(`- Vendedor 2: ${vendedor2.email}`);
  console.log(`- Empresas creadas y asociadas: ${empresaCombustible.nombre}, ${empresaLubricantes.nombre}`);
  console.log(`- Cliente corporativo: ${clienteCorporativo.razonSocial}`);
  console.log(`- Ventas históricas creadas: ${sales.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });