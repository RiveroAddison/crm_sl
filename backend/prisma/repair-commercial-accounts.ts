import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeRif(value: string | null) {
  return value?.trim().toUpperCase() || null;
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE');
}

async function findUniqueAccount(accounts: Awaited<ReturnType<typeof prisma.cuentaComercial.findMany>>, rif: string | null, name: string) {
  const rifMatches = rif ? accounts.filter((account) => normalizeRif(account.rif) === rif) : [];
  if (rifMatches.length === 1) return rifMatches[0];
  if (rifMatches.length > 1) return null;
  const nameMatches = accounts.filter((account) => normalizeName(account.nombre) === normalizeName(name));
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

async function main() {
  const accounts = await prisma.cuentaComercial.findMany({ orderBy: { createdAt: 'asc' } });
  const report = { normalized: 0, repairedLeads: 0, repairedOpportunities: 0, repairedOrders: 0, duplicateRifs: 0, ambiguous: 0 };
  const rifGroups = new Map<string, number>();

  for (const account of accounts) {
    const rif = normalizeRif(account.rif);
    if (rif) rifGroups.set(`${account.empresaId}:${rif}`, (rifGroups.get(`${account.empresaId}:${rif}`) || 0) + 1);
    const nombre = account.nombre.trim().replace(/\s+/g, ' ');
    if (nombre !== account.nombre || rif !== account.rif) {
      await prisma.cuentaComercial.update({ where: { id: account.id }, data: { nombre, rif } });
      report.normalized += 1;
    }
  }
  report.duplicateRifs = [...rifGroups.values()].filter((count) => count > 1).length;

  const refreshed = await prisma.cuentaComercial.findMany();
  const leads = await prisma.lead.findMany({ where: { cuentaComercialId: null } });
  for (const lead of leads) {
    const account = await findUniqueAccount(refreshed.filter((item) => item.empresaId === lead.empresaId), normalizeRif(lead.rif), lead.empresaNombre);
    if (!account) { report.ambiguous += 1; continue; }
    await prisma.lead.update({ where: { id: lead.id }, data: { cuentaComercialId: account.id } });
    report.repairedLeads += 1;
  }

  const opportunities = await prisma.oportunidad.findMany({ where: { cuentaComercialId: null } });
  for (const opportunity of opportunities) {
    const account = await findUniqueAccount(refreshed.filter((item) => item.empresaId === opportunity.empresaId), normalizeRif(opportunity.rif), opportunity.razonSocial);
    if (!account) { report.ambiguous += 1; continue; }
    await prisma.oportunidad.update({ where: { id: opportunity.id }, data: { cuentaComercialId: account.id } });
    report.repairedOpportunities += 1;
  }

  const orders = await prisma.pedido.findMany({ where: { cuentaComercialId: null }, include: { clienteEmpresa: { include: { clienteCorporativo: true } } } });
  for (const order of orders) {
    const account = await findUniqueAccount(refreshed.filter((item) => item.empresaId === order.empresaId), normalizeRif(order.clienteEmpresa.clienteCorporativo.rif), order.clienteEmpresa.clienteCorporativo.razonSocial);
    if (!account) { report.ambiguous += 1; continue; }
    await prisma.pedido.update({ where: { id: order.id }, data: { cuentaComercialId: account.id } });
    report.repairedOrders += 1;
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
