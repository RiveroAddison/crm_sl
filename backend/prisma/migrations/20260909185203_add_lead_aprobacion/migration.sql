-- CreateTable
CREATE TABLE "LeadAprobacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "aprobadoBy" TEXT NOT NULL,
    "oportunidadId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadAprobacion_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadAprobacion_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LeadAprobacion_leadId_idx" ON "LeadAprobacion"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAprobacion_leadId_rubro_key" ON "LeadAprobacion"("leadId", "rubro");
