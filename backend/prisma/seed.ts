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

  const hashedPassword = await bcrypt.hash('admin1234', 10);

  // Empresa GRUPO: credenciales del servidor central ad_grup
  const empresaGrupo = await prisma.empresa.create({
    data: {
      nombre: 'GRUPO',
      rif: null,
      rubro: null,
      profitDbHost: 'SRVBDPROFITBK',
      profitDbName: 'ad_grup',
      profitDbUser: 'solicitudweb',
      profitDbPassword: 'solicitudweb',
      activo: true,
    },
  });

  const usuarioMaster = await prisma.usuario.create({
    data: {
      nombre: 'Master',
      email: 'master@sanluis.com',
      password: hashedPassword,
      activo: true,
    },
  });

  await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usuarioMaster.id,
      empresaId: empresaGrupo.id,
      rol: 'MASTER',
    },
  });

  console.log('✅ Seed completado con éxito:');
  console.log(`- Master: ${usuarioMaster.email} (contraseña: admin1234)`);
  console.log(`- Empresa GRUPO: ${empresaGrupo.nombre} (ID: ${empresaGrupo.id})`);
  console.log(`- Profit Host: ${empresaGrupo.profitDbHost}`);
  console.log(`- Profit DB: ${empresaGrupo.profitDbName}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
