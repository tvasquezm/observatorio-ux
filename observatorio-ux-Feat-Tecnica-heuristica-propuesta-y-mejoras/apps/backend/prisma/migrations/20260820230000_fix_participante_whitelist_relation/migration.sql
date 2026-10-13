DROP INDEX "public"."participantes_whitelist_participanteId_key";

CREATE INDEX "participantes_whitelist_proyectoId_participanteId_idx"
ON "public"."participantes_whitelist"("proyectoId", "participanteId");
