-- Técnicas que el docente decide analizar en cada proyecto (por defecto las cinco).
ALTER TABLE "proyectos" ADD COLUMN "tecnicasAnalizadas" TEXT[] DEFAULT ARRAY['personas', 'journey-map', 'momentos-criticos', 'card-sorting', 'evaluacion-heuristica']::TEXT[];

-- Salida de un equipo: el acceso a los proyectos queda pendiente de revisión por el docente.
CREATE TABLE "revisiones_acceso_equipo" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "equipoNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),
    "resueltoPorId" TEXT,
    "decision" TEXT,

    CONSTRAINT "revisiones_acceso_equipo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revisiones_acceso_equipo_salaId_resueltoEn_idx" ON "revisiones_acceso_equipo"("salaId", "resueltoEn");

ALTER TABLE "revisiones_acceso_equipo" ADD CONSTRAINT "revisiones_acceso_equipo_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revisiones_acceso_equipo" ADD CONSTRAINT "revisiones_acceso_equipo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
