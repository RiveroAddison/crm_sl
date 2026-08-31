/*
  Warnings:

  - You are about to drop the `EmpresaProspecto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `empresaProspectoId` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `empresaProspectoId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `empresaProspectoId` on the `Oportunidad` table. All the data in the column will be lost.
  - You are about to drop the column `empresaProspectoId` on the `Pedido` table. All the data in the column will be lost.
  - Added the required column `empresaId` to the `ClienteEmpresa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `Oportunidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `Pedido` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmpresaProspecto";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClienteEmpresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteCorporativoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "profitCodCli" TEXT NOT NULL,
    "vendedor" TEXT,
    "estado" TEXT DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClienteEmpresa_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClienteEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClienteEmpresa" ("clienteCorporativoId", "createdAt", "estado", "id", "profitCodCli", "updatedAt", "vendedor") SELECT "clienteCorporativoId", "createdAt", "estado", "id", "profitCodCli", "updatedAt", "vendedor" FROM "ClienteEmpresa";
DROP TABLE "ClienteEmpresa";
ALTER TABLE "new_ClienteEmpresa" RENAME TO "ClienteEmpresa";
CREATE INDEX "ClienteEmpresa_empresaId_idx" ON "ClienteEmpresa"("empresaId");
CREATE INDEX "ClienteEmpresa_clienteCorporativoId_idx" ON "ClienteEmpresa"("clienteCorporativoId");
CREATE UNIQUE INDEX "ClienteEmpresa_empresaId_profitCodCli_key" ON "ClienteEmpresa"("empresaId", "profitCodCli");
CREATE TABLE "new_Lead" (
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
INSERT INTO "new_Lead" ("autoridad", "createdAt", "email", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId") SELECT "autoridad", "createdAt", "email", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_empresaId_estadoCalificacion_idx" ON "Lead"("empresaId", "estadoCalificacion");
CREATE INDEX "Lead_empresaId_vendedorId_idx" ON "Lead"("empresaId", "vendedorId");
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
INSERT INTO "new_Oportunidad" ("clienteCorporativoId", "createdAt", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre") SELECT "clienteCorporativoId", "createdAt", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre" FROM "Oportunidad";
DROP TABLE "Oportunidad";
ALTER TABLE "new_Oportunidad" RENAME TO "Oportunidad";
CREATE INDEX "Oportunidad_empresaId_vendedorId_idx" ON "Oportunidad"("empresaId", "vendedorId");
CREATE INDEX "Oportunidad_empresaId_etapa_idx" ON "Oportunidad"("empresaId", "etapa");
CREATE INDEX "Oportunidad_clienteCorporativoId_idx" ON "Oportunidad"("clienteCorporativoId");
CREATE INDEX "Oportunidad_leadId_idx" ON "Oportunidad"("leadId");
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "clienteEmpresaId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "montoTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_clienteEmpresaId_fkey" FOREIGN KEY ("clienteEmpresaId") REFERENCES "ClienteEmpresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteEmpresaId", "createdAt", "estado", "id", "montoTotal", "updatedAt", "vendedorId") SELECT "clienteEmpresaId", "createdAt", "estado", "id", "montoTotal", "updatedAt", "vendedorId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_empresaId_vendedorId_idx" ON "Pedido"("empresaId", "vendedorId");
CREATE INDEX "Pedido_empresaId_estado_idx" ON "Pedido"("empresaId", "estado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
