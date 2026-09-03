/*
  Warnings:

  - A unique constraint covering the columns `[empresaId,rif]` on the table `EmpresaCliente` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EmpresaCliente_empresaId_rif_key" ON "EmpresaCliente"("empresaId", "rif");
