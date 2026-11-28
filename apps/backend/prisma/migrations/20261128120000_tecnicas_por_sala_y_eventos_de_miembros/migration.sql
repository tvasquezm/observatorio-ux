-- Las técnicas que se analizan se eligen por sala y valen para todos sus proyectos (por defecto las cinco).
ALTER TABLE "Sala" ADD COLUMN "tecnicasAnalizadas" TEXT[] DEFAULT ARRAY['personas', 'journey-map', 'momentos-criticos', 'card-sorting', 'evaluacion-heuristica']::TEXT[];

-- Altas y bajas de integrantes de un proyecto, visibles para el docente.
CREATE TABLE "proyecto_miembro_eventos" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_miembro_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proyecto_miembro_eventos_proyectoId_createdAt_idx" ON "proyecto_miembro_eventos"("proyectoId", "createdAt");

ALTER TABLE "proyecto_miembro_eventos" ADD CONSTRAINT "proyecto_miembro_eventos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
