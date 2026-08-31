/*
  Warnings:

  - You are about to drop the column `empresaId` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `Oportunidad` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `Pedido` table. All the data in the column will be lost.
  - Added the required column `empresaProspectoId` to the `ClienteEmpresa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaProspectoId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaProspectoId` to the `Oportunidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaProspectoId` to the `Pedido` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "EmpresaProspecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClienteEmpresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteCorporativoId" TEXT NOT NULL,
    "empresaProspectoId" TEXT NOT NULL,
    "profitCodCli" TEXT NOT NULL,
    "vendedor" TEXT,
    "estado" TEXT DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClienteEmpresa_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClienteEmpresa_empresaProspectoId_fkey" FOREIGN KEY ("empresaProspectoId") REFERENCES "EmpresaProspecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClienteEmpresa" ("clienteCorporativoId", "createdAt", "estado", "id", "profitCodCli", "updatedAt", "vendedor") SELECT "clienteCorporativoId", "createdAt", "estado", "id", "profitCodCli", "updatedAt", "vendedor" FROM "ClienteEmpresa";
DROP TABLE "ClienteEmpresa";
ALTER TABLE "new_ClienteEmpresa" RENAME TO "ClienteEmpresa";
CREATE INDEX "ClienteEmpresa_empresaProspectoId_idx" ON "ClienteEmpresa"("empresaProspectoId");
CREATE INDEX "ClienteEmpresa_clienteCorporativoId_idx" ON "ClienteEmpresa"("clienteCorporativoId");
CREATE UNIQUE INDEX "ClienteEmpresa_empresaProspectoId_profitCodCli_key" ON "ClienteEmpresa"("empresaProspectoId", "profitCodCli");
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaProspectoId" TEXT NOT NULL,
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
    CONSTRAINT "Lead_empresaProspectoId_fkey" FOREIGN KEY ("empresaProspectoId") REFERENCES "EmpresaProspecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("autoridad", "createdAt", "email", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId") SELECT "autoridad", "createdAt", "email", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_empresaProspectoId_estadoCalificacion_idx" ON "Lead"("empresaProspectoId", "estadoCalificacion");
CREATE INDEX "Lead_empresaProspectoId_vendedorId_idx" ON "Lead"("empresaProspectoId", "vendedorId");
CREATE TABLE "new_Oportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaProspectoId" TEXT NOT NULL,
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
    CONSTRAINT "Oportunidad_empresaProspectoId_fkey" FOREIGN KEY ("empresaProspectoId") REFERENCES "EmpresaProspecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Oportunidad" ("clienteCorporativoId", "createdAt", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre") SELECT "clienteCorporativoId", "createdAt", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre" FROM "Oportunidad";
DROP TABLE "Oportunidad";
ALTER TABLE "new_Oportunidad" RENAME TO "Oportunidad";
CREATE INDEX "Oportunidad_empresaProspectoId_vendedorId_idx" ON "Oportunidad"("empresaProspectoId", "vendedorId");
CREATE INDEX "Oportunidad_empresaProspectoId_etapa_idx" ON "Oportunidad"("empresaProspectoId", "etapa");
CREATE INDEX "Oportunidad_clienteCorporativoId_idx" ON "Oportunidad"("clienteCorporativoId");
CREATE INDEX "Oportunidad_leadId_idx" ON "Oportunidad"("leadId");
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaProspectoId" TEXT NOT NULL,
    "clienteEmpresaId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "montoTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_empresaProspectoId_fkey" FOREIGN KEY ("empresaProspectoId") REFERENCES "EmpresaProspecto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_clienteEmpresaId_fkey" FOREIGN KEY ("clienteEmpresaId") REFERENCES "ClienteEmpresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteEmpresaId", "createdAt", "estado", "id", "montoTotal", "updatedAt", "vendedorId") SELECT "clienteEmpresaId", "createdAt", "estado", "id", "montoTotal", "updatedAt", "vendedorId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_empresaProspectoId_vendedorId_idx" ON "Pedido"("empresaProspectoId", "vendedorId");
CREATE INDEX "Pedido_empresaProspectoId_estado_idx" ON "Pedido"("empresaProspectoId", "estado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
