-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Oportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "clienteCorporativoId" TEXT,
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
    CONSTRAINT "Oportunidad_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Oportunidad" ("createdAt", "empresaId", "etapa", "fechaContacto", "id", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre") SELECT "createdAt", "empresaId", "etapa", "fechaContacto", "id", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre" FROM "Oportunidad";
DROP TABLE "Oportunidad";
ALTER TABLE "new_Oportunidad" RENAME TO "Oportunidad";
CREATE INDEX "Oportunidad_empresaId_vendedorId_idx" ON "Oportunidad"("empresaId", "vendedorId");
CREATE INDEX "Oportunidad_empresaId_etapa_idx" ON "Oportunidad"("empresaId", "etapa");
CREATE INDEX "Oportunidad_clienteCorporativoId_idx" ON "Oportunidad"("clienteCorporativoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
