-- CreateTable
CREATE TABLE "public"."comentarios" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "artefactoLogicoId" TEXT,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."comentarios" ADD CONSTRAINT "comentarios_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comentarios" ADD CONSTRAINT "comentarios_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
