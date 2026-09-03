/*
  Warnings:

  - You are about to drop the `EmpresaCliente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `empresaClienteId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `empresaClienteId` on the `Oportunidad` table. All the data in the column will be lost.
  - You are about to drop the column `empresaClienteId` on the `Pedido` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EmpresaCliente_empresaId_rif_key";

-- DropIndex
DROP INDEX "EmpresaCliente_empresaId_rif_idx";

-- DropIndex
DROP INDEX "EmpresaCliente_empresaId_nombre_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmpresaCliente";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CuentaComercial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rif" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CuentaComercial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "cuentaComercialId" TEXT,
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
    CONSTRAINT "Lead_cuentaComercialId_fkey" FOREIGN KEY ("cuentaComercialId") REFERENCES "CuentaComercial" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("autoridad", "createdAt", "email", "empresaId", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId") SELECT "autoridad", "createdAt", "email", "empresaId", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_empresaId_estadoCalificacion_idx" ON "Lead"("empresaId", "estadoCalificacion");
CREATE INDEX "Lead_empresaId_vendedorId_idx" ON "Lead"("empresaId", "vendedorId");
CREATE INDEX "Lead_cuentaComercialId_idx" ON "Lead"("cuentaComercialId");
CREATE TABLE "new_Oportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "cuentaComercialId" TEXT,
    "clienteCorporativoId" TEXT,
    "leadId" TEXT,
    "vendedorId" TEXT NOT NULL,
    "vendedorNombre" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "rubro" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "razonSocial" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'NUEVO',
    "valorEstimado" REAL NOT NULL,
    "fechaContacto" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Oportunidad_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_cuentaComercialId_fkey" FOREIGN KEY ("cuentaComercialId") REFERENCES "CuentaComercial" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Oportunidad" ("clienteCorporativoId", "createdAt", "direccion", "empresaId", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "rubro", "telefono", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre") SELECT "clienteCorporativoId", "createdAt", "direccion", "empresaId", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "rubro", "telefono", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre" FROM "Oportunidad";
DROP TABLE "Oportunidad";
ALTER TABLE "new_Oportunidad" RENAME TO "Oportunidad";
CREATE INDEX "Oportunidad_empresaId_vendedorId_idx" ON "Oportunidad"("empresaId", "vendedorId");
CREATE INDEX "Oportunidad_empresaId_etapa_idx" ON "Oportunidad"("empresaId", "etapa");
CREATE INDEX "Oportunidad_cuentaComercialId_idx" ON "Oportunidad"("cuentaComercialId");
CREATE INDEX "Oportunidad_clienteCorporativoId_idx" ON "Oportunidad"("clienteCorporativoId");
CREATE INDEX "Oportunidad_leadId_idx" ON "Oportunidad"("leadId");
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "cuentaComercialId" TEXT,
    "clienteEmpresaId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "montoTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_cuentaComercialId_fkey" FOREIGN KEY ("cuentaComercialId") REFERENCES "CuentaComercial" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_clienteEmpresaId_fkey" FOREIGN KEY ("clienteEmpresaId") REFERENCES "ClienteEmpresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteEmpresaId", "createdAt", "empresaId", "estado", "id", "montoTotal", "updatedAt", "vendedorId") SELECT "clienteEmpresaId", "createdAt", "empresaId", "estado", "id", "montoTotal", "updatedAt", "vendedorId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_empresaId_vendedorId_idx" ON "Pedido"("empresaId", "vendedorId");
CREATE INDEX "Pedido_empresaId_estado_idx" ON "Pedido"("empresaId", "estado");
CREATE INDEX "Pedido_cuentaComercialId_idx" ON "Pedido"("cuentaComercialId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CuentaComercial_empresaId_rif_idx" ON "CuentaComercial"("empresaId", "rif");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaComercial_empresaId_nombre_key" ON "CuentaComercial"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaComercial_empresaId_rif_key" ON "CuentaComercial"("empresaId", "rif");
