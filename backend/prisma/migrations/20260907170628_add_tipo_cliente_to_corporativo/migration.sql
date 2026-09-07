-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClienteCorporativo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rif" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "matriz" BOOLEAN NOT NULL DEFAULT false,
    "tipoClienteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClienteCorporativo_tipoClienteId_fkey" FOREIGN KEY ("tipoClienteId") REFERENCES "TipoCliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClienteCorporativo" ("createdAt", "direccion", "id", "matriz", "razonSocial", "rif", "telefono", "updatedAt") SELECT "createdAt", "direccion", "id", "matriz", "razonSocial", "rif", "telefono", "updatedAt" FROM "ClienteCorporativo";
DROP TABLE "ClienteCorporativo";
ALTER TABLE "new_ClienteCorporativo" RENAME TO "ClienteCorporativo";
CREATE UNIQUE INDEX "ClienteCorporativo_rif_key" ON "ClienteCorporativo"("rif");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
