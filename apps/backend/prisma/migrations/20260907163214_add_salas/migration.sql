-- AlterTable
ALTER TABLE "public"."proyectos" ADD COLUMN     "salaId" TEXT;

-- CreateTable
CREATE TABLE "public"."Sala" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "instrucciones" TEXT,
    "profesorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."proyectos" ADD CONSTRAINT "proyectos_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "public"."Sala"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sala" ADD CONSTRAINT "Sala_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
