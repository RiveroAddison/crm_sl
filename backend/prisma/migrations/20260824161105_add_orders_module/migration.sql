-- CreateTable
CREATE TABLE "Pedido" (
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

-- CreateTable
CREATE TABLE "DetallePedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pedidoId" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" REAL NOT NULL,
    CONSTRAINT "DetallePedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Pedido_empresaId_vendedorId_idx" ON "Pedido"("empresaId", "vendedorId");

-- CreateIndex
CREATE INDEX "Pedido_empresaId_estado_idx" ON "Pedido"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "DetallePedido_pedidoId_idx" ON "DetallePedido"("pedidoId");
