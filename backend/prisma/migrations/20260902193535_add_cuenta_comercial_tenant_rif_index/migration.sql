-- DropIndex
DROP INDEX "EmpresaCliente_rif_idx";

-- DropIndex
DROP INDEX "EmpresaCliente_empresaId_idx";

-- CreateIndex
CREATE INDEX "EmpresaCliente_empresaId_rif_idx" ON "EmpresaCliente"("empresaId", "rif");
