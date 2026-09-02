-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClienteEmpresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteCorporativoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "profitCodCli" TEXT NOT NULL,
    "vendedor" TEXT,
    "vendedorId" TEXT,
    "estado" TEXT DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClienteEmpresa_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClienteEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClienteEmpresa_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClienteEmpresa" ("clienteCorporativoId", "createdAt", "empresaId", "estado", "id", "profitCodCli", "updatedAt", "vendedor") SELECT "clienteCorporativoId", "createdAt", "empresaId", "estado", "id", "profitCodCli", "updatedAt", "vendedor" FROM "ClienteEmpresa";
DROP TABLE "ClienteEmpresa";
ALTER TABLE "new_ClienteEmpresa" RENAME TO "ClienteEmpresa";
CREATE INDEX "ClienteEmpresa_empresaId_idx" ON "ClienteEmpresa"("empresaId");
CREATE INDEX "ClienteEmpresa_clienteCorporativoId_idx" ON "ClienteEmpresa"("clienteCorporativoId");
CREATE UNIQUE INDEX "ClienteEmpresa_empresaId_profitCodCli_key" ON "ClienteEmpresa"("empresaId", "profitCodCli");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
