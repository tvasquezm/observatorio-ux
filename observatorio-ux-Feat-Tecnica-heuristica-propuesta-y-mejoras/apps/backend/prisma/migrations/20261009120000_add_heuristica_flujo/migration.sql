CREATE TABLE "evaluaciones_heuristicas_completas" (
  "id" TEXT NOT NULL, "proyectoId" TEXT NOT NULL, "coordinadorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
  "anteriorId" TEXT, "fase" TEXT NOT NULL DEFAULT 'BORRADOR',
  "configuracion" JSONB NOT NULL, "trabajos" JSONB NOT NULL, "consenso" JSONB NOT NULL,
  "informe" JSONB, "comparacion" JSONB, "iniciadoEn" TIMESTAMP(3),
  "consolidadoEn" TIMESTAMP(3), "finalizadoEn" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluaciones_heuristicas_completas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluaciones_heuristicas_completas_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "evaluaciones_heuristicas_completas_fase_check" CHECK ("fase" IN ('BORRADOR','EN_EVALUACION','PENDIENTE_CONSENSO','CONSOLIDADA','FINALIZADA')),
  CONSTRAINT "evaluaciones_heuristicas_completas_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "evaluaciones_heuristicas_completas_proyectoId_idx" ON "evaluaciones_heuristicas_completas"("proyectoId");
CREATE TABLE "metodologias_heuristicas" (
  "id" TEXT NOT NULL, "autorId" TEXT NOT NULL, "contenido" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metodologias_heuristicas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "metodologias_heuristicas_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "metodologias_heuristicas_autorId_idx" ON "metodologias_heuristicas"("autorId");
CREATE TABLE "evidencias_heuristicas_completas" (
  "id" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0, "evaluacionId" TEXT NOT NULL, "autorId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "tamano" INTEGER NOT NULL, "datos" BYTEA NOT NULL,
  "anotaciones" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidencias_heuristicas_completas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evidencias_heuristicas_completas_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "evidencias_heuristicas_completas_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones_heuristicas_completas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "evidencias_heuristicas_completas_evaluacionId_autorId_idx" ON "evidencias_heuristicas_completas"("evaluacionId", "autorId");
