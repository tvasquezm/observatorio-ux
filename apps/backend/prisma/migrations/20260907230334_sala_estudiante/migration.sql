-- CreateTable
CREATE TABLE "public"."sala_estudiantes" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "nombre" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sala_estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sala_estudiantes_salaId_email_key" ON "public"."sala_estudiantes"("salaId", "email");

-- AddForeignKey
ALTER TABLE "public"."sala_estudiantes" ADD CONSTRAINT "sala_estudiantes_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "public"."Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
