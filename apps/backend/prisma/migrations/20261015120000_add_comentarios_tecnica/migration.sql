-- AlterTable
ALTER TABLE "public"."comentarios" ADD COLUMN "tecnica" TEXT;

-- CreateIndex
CREATE INDEX "comentarios_proyectoId_tecnica_idx" ON "public"."comentarios"("proyectoId", "tecnica");
