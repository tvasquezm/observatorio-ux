-- AlterTable
ALTER TABLE "public"."Sala" ADD COLUMN     "permiteCreacionEquipos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limiteIntegrantesEquipo" INTEGER;

-- CreateTable
CREATE TABLE "public"."equipos" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipo_miembros" (
    "id" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipo_miembros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipo_miembros_equipoId_usuarioId_key" ON "public"."equipo_miembros"("equipoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "public"."equipos" ADD CONSTRAINT "equipos_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "public"."Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipos" ADD CONSTRAINT "equipos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipo_miembros" ADD CONSTRAINT "equipo_miembros_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "public"."equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipo_miembros" ADD CONSTRAINT "equipo_miembros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
