-- Nombre legible para distinguir múltiples estudios dentro de un proyecto.
-- El default conserva todas las sesiones existentes sin backfill manual.
ALTER TABLE "public"."research_sessions"
ADD COLUMN "nombre" TEXT NOT NULL DEFAULT 'Card Sorting';
