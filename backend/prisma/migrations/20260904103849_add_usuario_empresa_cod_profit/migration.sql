-- AlterTable
-- Agregamos codProfit a la tabla pivote UsuarioEmpresa para soportar
-- idempotencia de la sincronización de vendedores desde Profit Plus.
ALTER TABLE "UsuarioEmpresa" ADD COLUMN "codProfit" TEXT;

-- CreateIndex
-- Unicidad por (empresaId, codProfit). SQLite trata NULL como distinto,
-- por lo que usuarios no sincronizados desde Profit (codProfit NULL) conviven
-- sin violar la restricción. Esto preserva la integridad para registros ya existentes.
CREATE UNIQUE INDEX "UsuarioEmpresa_empresaId_codProfit_key" ON "UsuarioEmpresa"("empresaId", "codProfit");