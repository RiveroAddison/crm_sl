-- CreateTable
CREATE TABLE "EmpresaCliente" (
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
    CONSTRAINT "EmpresaCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "empresaClienteId" TEXT,
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
    CONSTRAINT "Lead_empresaClienteId_fkey" FOREIGN KEY ("empresaClienteId") REFERENCES "EmpresaCliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("autoridad", "createdAt", "email", "empresaId", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId") SELECT "autoridad", "createdAt", "email", "empresaId", "empresaNombre", "estadoCalificacion", "fuente", "id", "necesidad", "nombreContacto", "presupuesto", "rif", "telefono", "tiempo", "updatedAt", "vendedorId" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_empresaId_estadoCalificacion_idx" ON "Lead"("empresaId", "estadoCalificacion");
CREATE INDEX "Lead_empresaId_vendedorId_idx" ON "Lead"("empresaId", "vendedorId");
CREATE INDEX "Lead_empresaClienteId_idx" ON "Lead"("empresaClienteId");
CREATE TABLE "new_Oportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "empresaClienteId" TEXT,
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
    CONSTRAINT "Oportunidad_empresaClienteId_fkey" FOREIGN KEY ("empresaClienteId") REFERENCES "EmpresaCliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Oportunidad_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Oportunidad" ("clienteCorporativoId", "createdAt", "empresaId", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre") SELECT "clienteCorporativoId", "createdAt", "empresaId", "etapa", "fechaContacto", "id", "leadId", "razonSocial", "rif", "titulo", "updatedAt", "valorEstimado", "vendedorId", "vendedorNombre" FROM "Oportunidad";
DROP TABLE "Oportunidad";
ALTER TABLE "new_Oportunidad" RENAME TO "Oportunidad";
CREATE INDEX "Oportunidad_empresaId_vendedorId_idx" ON "Oportunidad"("empresaId", "vendedorId");
CREATE INDEX "Oportunidad_empresaId_etapa_idx" ON "Oportunidad"("empresaId", "etapa");
CREATE INDEX "Oportunidad_empresaClienteId_idx" ON "Oportunidad"("empresaClienteId");
CREATE INDEX "Oportunidad_clienteCorporativoId_idx" ON "Oportunidad"("clienteCorporativoId");
CREATE INDEX "Oportunidad_leadId_idx" ON "Oportunidad"("leadId");
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "empresaClienteId" TEXT,
    "clienteEmpresaId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "montoTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_empresaClienteId_fkey" FOREIGN KEY ("empresaClienteId") REFERENCES "EmpresaCliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_clienteEmpresaId_fkey" FOREIGN KEY ("clienteEmpresaId") REFERENCES "ClienteEmpresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteEmpresaId", "createdAt", "empresaId", "estado", "id", "montoTotal", "updatedAt", "vendedorId") SELECT "clienteEmpresaId", "createdAt", "empresaId", "estado", "id", "montoTotal", "updatedAt", "vendedorId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_empresaId_vendedorId_idx" ON "Pedido"("empresaId", "vendedorId");
CREATE INDEX "Pedido_empresaId_estado_idx" ON "Pedido"("empresaId", "estado");
CREATE INDEX "Pedido_empresaClienteId_idx" ON "Pedido"("empresaClienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmpresaCliente_empresaId_idx" ON "EmpresaCliente"("empresaId");

-- CreateIndex
CREATE INDEX "EmpresaCliente_rif_idx" ON "EmpresaCliente"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaCliente_empresaId_nombre_key" ON "EmpresaCliente"("empresaId", "nombre");
