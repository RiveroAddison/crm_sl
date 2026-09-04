import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const empresa = await p.empresa.findFirst({
    where: { nombre: { contains: 'San Luis' } },
  });
  if (!empresa) {
    console.error('No hay empresa San Luis');
    process.exit(1);
  }

  console.log('=== USUARIOS creados por sync ===');
  const syncUsuarios = await p.usuario.findMany({
    where: { usuarioEmpresas: { some: { empresaId: empresa.id, codProfit: { not: null } } } },
    include: { usuarioEmpresas: { where: { empresaId: empresa.id } } },
    orderBy: { email: 'asc' },
  });
  for (const u of syncUsuarios) {
    const ue = u.usuarioEmpresas[0];
    console.log(`  ${u.email} | nombre="${u.nombre}" | codProfit=${ue?.codProfit} | rol=${ue?.rol}`);
  }

  console.log('\n=== CLIENTES CORPORATIVOS ===');
  const corporativos = await p.clienteCorporativo.findMany({
    where: { clientesEmpresa: { some: { empresaId: empresa.id } } },
    include: { clientesEmpresa: { where: { empresaId: empresa.id }, include: { vendedor_usuario: { select: { email: true, nombre: true } } } } },
  });
  for (const c of corporativos) {
    const ce = c.clientesEmpresa[0];
    console.log(`  ${c.rif} | "${c.razonSocial}" | dir="${c.direccion}" | tel="${c.telefono}"`);
    console.log(`     profitCodCli=${ce?.profitCodCli} | vendedorId=${ce?.vendedorId ? 'YES' : 'NO'} | vendedor=${ce?.vendedor_usuario?.email ?? '-'} | estado=${ce?.estado}`);
  }

  console.log('\n=== VENTAS ===');
  const ventas = await p.ventaCliente.findMany({
    where: { clienteEmpresa: { empresaId: empresa.id } },
    include: { clienteEmpresa: { include: { clienteCorporativo: { select: { rif: true, razonSocial: true } } } } },
    orderBy: [{ clienteEmpresaId: 'asc' }, { documento: 'asc' }],
  });
  for (const v of ventas) {
    console.log(`  doc=${v.documento} | fecha=${v.fecha.toISOString().slice(0, 10)} | mes=${v.mes} | semana=${v.semana} | unidades=${v.unidades} | monto=${v.monto} | cliente=${v.clienteEmpresa.clienteCorporativo.razonSocial}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
