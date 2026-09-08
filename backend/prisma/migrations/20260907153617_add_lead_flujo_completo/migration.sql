/*
  Warnings:

  - You are about to drop the column `email` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `Lead` table. All the data in the column will be lost.
  - Added the required column `estado` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaCaptacion` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ActividadLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActividadLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActividadLead_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadRechazo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "rechazadoBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadRechazo_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TipoCliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TipoCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "cuentaComercialId" TEXT,
    "empresaNombre" TEXT NOT NULL,
    "rif" TEXT,
    "direccion" TEXT,
    "telefonoEmpresa" TEXT,
    "tipoIndustria" TEXT,
    "cedulaContacto" TEXT,
    "nombreContacto" TEXT NOT NULL,
    "cargoContacto" TEXT,
    "telefonoContacto" TEXT,
    "emailContacto" TEXT,
    "fuente" TEXT NOT NULL,
    "fechaCaptacion" DATETIME NOT NULL,
    "descripcionCaptacion" TEXT,
    "estado" TEXT NOT NULL,
    "estadoCalificacion" TEXT NOT NULL DEFAULT 'NUEVO',
    "presupuesto" REAL,
    "necesidad" TEXT,
    "autoridad" TEXT,
    "tiempo" TEXT,
    "vendedorId" TEXT NOT NULL,
    "rubroOriginal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_cuentaComercialId_fkey" FOREIGN KEY ("cuentaComercialId") REFERENCES "CuentaComercial" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("autoridad", "createdAt", "cuentaComercialId", "empresaId", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "tiempo", "updatedAt", "vendedorId") SELECT "autoridad", "createdAt", "cuentaComercialId", "empresaId", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "tiempo", "updatedAt", "vendedorId" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_empresaId_estado_idx" ON "Lead"("empresaId", "estado");
CREATE INDEX "Lead_empresaId_estadoCalificacion_idx" ON "Lead"("empresaId", "estadoCalificacion");
CREATE INDEX "Lead_empresaId_vendedorId_idx" ON "Lead"("empresaId", "vendedorId");
CREATE INDEX "Lead_cuentaComercialId_idx" ON "Lead"("cuentaComercialId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActividadLead_leadId_fecha_idx" ON "ActividadLead"("leadId", "fecha");

-- CreateIndex
CREATE INDEX "ActividadLead_empresaId_leadId_idx" ON "ActividadLead"("empresaId", "leadId");

-- CreateIndex
CREATE INDEX "LeadRechazo_leadId_idx" ON "LeadRechazo"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadRechazo_leadId_rubro_key" ON "LeadRechazo"("leadId", "rubro");

-- CreateIndex
CREATE INDEX "TipoCliente_empresaId_idx" ON "TipoCliente"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCliente_empresaId_nombre_key" ON "TipoCliente"("empresaId", "nombre");
