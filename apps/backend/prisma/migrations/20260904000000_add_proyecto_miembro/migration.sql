-- CreateTable
CREATE TABLE "proyecto_miembros" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_miembros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_miembros_proyectoId_usuarioId_key" ON "proyecto_miembros"("proyectoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "proyecto_miembros" ADD CONSTRAINT "proyecto_miembros_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_miembros" ADD CONSTRAINT "proyecto_miembros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: cada proyecto existente conserva acceso — se inserta a su
-- creador como miembro para que nadie pierda acceso al migrar.
INSERT INTO "proyecto_miembros" ("id", "proyectoId", "usuarioId")
SELECT gen_random_uuid()::text, "id", "creadoPorId"
FROM "proyectos"
ON CONFLICT DO NOTHING;
