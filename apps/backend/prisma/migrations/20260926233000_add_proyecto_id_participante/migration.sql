-- H5 (Fase 7, plan de remediación 2026-09-24): nullable para no romper
-- filas existentes; habilita el límite de accesos/hora por proyecto en
-- accessParticipant.
ALTER TABLE "public"."participantes"
ADD COLUMN "proyectoId" TEXT;

-- CreateIndex
CREATE INDEX "participantes_proyectoId_createdAt_idx" ON "public"."participantes"("proyectoId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."participantes" ADD CONSTRAINT "participantes_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
