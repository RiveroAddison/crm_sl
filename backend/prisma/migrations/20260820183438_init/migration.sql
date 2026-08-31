-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "profitDbHost" TEXT,
    "profitDbName" TEXT,
    "profitDbUser" TEXT,
    "profitDbPassword" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsuarioEmpresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'VENDEDOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsuarioEmpresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsuarioEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClienteCorporativo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rif" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "matriz" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClienteEmpresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteCorporativoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "profitCodCli" TEXT NOT NULL,
    "vendedor" TEXT,
    "estado" TEXT DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClienteEmpresa_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClienteEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrossSellingMatriz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteCorporativoId" TEXT NOT NULL,
    "combustible" TEXT NOT NULL DEFAULT 'NA',
    "lubricantes" TEXT NOT NULL DEFAULT 'NA',
    "autopartes" TEXT NOT NULL DEFAULT 'NA',
    "transporte" TEXT NOT NULL DEFAULT 'NA',
    "alimentosBalanceados" TEXT NOT NULL DEFAULT 'NA',
    "alimentosCongelados" TEXT NOT NULL DEFAULT 'NA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrossSellingMatriz_clienteCorporativoId_fkey" FOREIGN KEY ("clienteCorporativoId") REFERENCES "ClienteCorporativo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "UsuarioEmpresa_empresaId_idx" ON "UsuarioEmpresa"("empresaId");

-- CreateIndex
CREATE INDEX "UsuarioEmpresa_usuarioId_idx" ON "UsuarioEmpresa"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioEmpresa_usuarioId_empresaId_key" ON "UsuarioEmpresa"("usuarioId", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ClienteCorporativo_rif_key" ON "ClienteCorporativo"("rif");

-- CreateIndex
CREATE INDEX "ClienteEmpresa_empresaId_idx" ON "ClienteEmpresa"("empresaId");

-- CreateIndex
CREATE INDEX "ClienteEmpresa_clienteCorporativoId_idx" ON "ClienteEmpresa"("clienteCorporativoId");

-- CreateIndex
CREATE UNIQUE INDEX "ClienteEmpresa_empresaId_profitCodCli_key" ON "ClienteEmpresa"("empresaId", "profitCodCli");

-- CreateIndex
CREATE UNIQUE INDEX "CrossSellingMatriz_clienteCorporativoId_key" ON "CrossSellingMatriz"("clienteCorporativoId");

-- CreateIndex
CREATE INDEX "CrossSellingMatriz_clienteCorporativoId_idx" ON "CrossSellingMatriz"("clienteCorporativoId");
