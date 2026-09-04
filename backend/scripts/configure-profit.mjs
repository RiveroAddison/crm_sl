import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const empresa = await p.empresa.findFirst({
    where: { nombre: { contains: 'San Luis' } },
  });

  if (!empresa) {
    console.error('No se encontró empresa San Luis');
    process.exit(1);
  }

  console.log('Empresa antes:', empresa);

  const updated = await p.empresa.update({
    where: { id: empresa.id },
    data: {
      profitDbHost: process.env.PROFIT_HOST ?? 'SRVBDPROFITBK',
      profitDbName: process.env.PROFIT_NAME ?? 'AD_DIST',
      profitDbUser: process.env.PROFIT_USER ?? 'solicitudweb',
      profitDbPassword: process.env.PROFIT_PASSWORD ?? 'solicitudweb',
    },
  });

  console.log('Empresa después:', updated);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
