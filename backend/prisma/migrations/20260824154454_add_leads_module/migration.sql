-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "empresaNombre" TEXT NOT NULL,
    "rif" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "fuente" TEXT NOT NULL,
    "estadoCalificacion" TEXT NOT NULL DEFAULT 'NUEVO',
    "presupuesto" REAL,
    "necesidad" TEXT,
    "autoridad" TEXT,
    "tiempo" TEXT,
    "vendedorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Oportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "clienteCorporativoId" TEXT,
    "leadId" TEXT,
    "vendedorId" TEXT NOT NULL,
    "vendedorNombre" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'NUEVO',
    "valorEstimado" REAL NOT NULL,
    "fechaContacto" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Oportunidad_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Oportunidad" ("clienteCorporativoId", "createdAt", "empresaId", "etapa", "fechaContacto", "id", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre") SELECT "clienteCorporativoId", "createdAt", "empresaId", "etapa", "fechaContacto", "id", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre" FROM "Oportunidad";
DROP TABLE "Oportunidad";
ALTER TABLE "new_Oportunidad" RENAME TO "Oportunidad";
CREATE INDEX "Oportunidad_empresaId_vendedorId_idx" ON "Oportunidad"("empresaId", "vendedorId");
CREATE INDEX "Oportunidad_empresaId_etapa_idx" ON "Oportunidad"("empresaId", "etapa");
CREATE INDEX "Oportunidad_clienteCorporativoId_idx" ON "Oportunidad"("clienteCorporativoId");
CREATE INDEX "Oportunidad_leadId_idx" ON "Oportunidad"("leadId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Lead_empresaId_estadoCalificacion_idx" ON "Lead"("empresaId", "estadoCalificacion");

-- CreateIndex
CREATE INDEX "Lead_empresaId_vendedorId_idx" ON "Lead"("empresaId", "vendedorId");
