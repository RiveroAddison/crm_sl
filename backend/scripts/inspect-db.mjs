import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const u = await p.usuario.count();
  const ue = await p.usuarioEmpresa.count();
  const e = await p.empresa.count();
  const cc = await p.clienteCorporativo.count();
  const ce = await p.clienteEmpresa.count();
  const vc = await p.ventaCliente.count();

  const empresa = await p.empresa.findFirst();
  const usuarios = await p.usuario.findMany({
    include: { usuarioEmpresas: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log(JSON.stringify({
    counts: {
      usuarios: u,
      usuarioEmpresas: ue,
      empresas: e,
      clienteCorporativo: cc,
      clienteEmpresa: ce,
      ventaCliente: vc
    },
    empresa,
    usuarios
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
