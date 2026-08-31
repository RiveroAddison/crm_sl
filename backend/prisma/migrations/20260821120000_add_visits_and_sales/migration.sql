-- CreateTable
CREATE TABLE "VisitaCliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteEmpresaId" TEXT NOT NULL,
    "semana" INTEGER NOT NULL,
    "dia" TEXT NOT NULL,
    "fecha" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "visitadoAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisitaCliente_clienteEmpresaId_fkey" FOREIGN KEY ("clienteEmpresaId") REFERENCES "ClienteEmpresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VentaCliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteEmpresaId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "semana" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL,
    "documento" TEXT NOT NULL,
    "unidades" INTEGER NOT NULL,
    "monto" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentaCliente_clienteEmpresaId_fkey" FOREIGN KEY ("clienteEmpresaId") REFERENCES "ClienteEmpresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitaCliente_clienteEmpresaId_semana_dia_key" ON "VisitaCliente"("clienteEmpresaId", "semana", "dia");
CREATE INDEX "VisitaCliente_semana_dia_idx" ON "VisitaCliente"("semana", "dia");
CREATE UNIQUE INDEX "VentaCliente_clienteEmpresaId_documento_key" ON "VentaCliente"("clienteEmpresaId", "documento");
CREATE INDEX "VentaCliente_clienteEmpresaId_mes_idx" ON "VentaCliente"("clienteEmpresaId", "mes");
