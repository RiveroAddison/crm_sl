-- CreateTable
CREATE TABLE "Oportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
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
    CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Oportunidad_empresaId_vendedorId_idx" ON "Oportunidad"("empresaId", "vendedorId");

-- CreateIndex
CREATE INDEX "Oportunidad_empresaId_etapa_idx" ON "Oportunidad"("empresaId", "etapa");
