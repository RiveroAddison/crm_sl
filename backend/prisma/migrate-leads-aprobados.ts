import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migración de leads aprobados...');

  // Find all approved leads without rubroOriginal
  const leadsToFix = await prisma.lead.findMany({
    where: {
      estado: 'APROBADO',
      rubroOriginal: null
    },
    include: {
      oportunidades: true
    }
  });

  console.log(`📊 Encontrados ${leadsToFix.length} leads aprobados sin rubroOriginal`);

  let fixed = 0;
  for (const lead of leadsToFix) {
    if (lead.oportunidades.length > 0) {
      const opp = lead.oportunidades[0]; // Take the first opportunity
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          rubroOriginal: opp.rubro,
          presupuesto: opp.valorEstimado
        }
      });
      console.log(`  ✅ Lead ${lead.empresaNombre} (${lead.id}) - Rubro: ${opp.rubro}`);
      fixed++;
    } else {
      console.log(`  ⚠️ Lead ${lead.empresaNombre} (${lead.id}) - Sin oportunidad vinculada`);
    }
  }

  console.log(`\n✨ Migración completada: ${fixed} leads actualizados`);
}

main()
  .catch((e) => {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
