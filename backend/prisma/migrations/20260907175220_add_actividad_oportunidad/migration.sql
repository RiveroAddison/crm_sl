-- CreateTable
CREATE TABLE "ActividadOportunidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oportunidadId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActividadOportunidad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActividadOportunidad_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActividadOportunidad_oportunidadId_fecha_idx" ON "ActividadOportunidad"("oportunidadId", "fecha");

-- CreateIndex
CREATE INDEX "ActividadOportunidad_empresaId_oportunidadId_idx" ON "ActividadOportunidad"("empresaId", "oportunidadId");
