-- CreateTable
CREATE TABLE "public"."participantes_whitelist" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "participanteId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participantes_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participantes_whitelist_participanteId_key" ON "public"."participantes_whitelist"("participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "participantes_whitelist_proyectoId_email_key" ON "public"."participantes_whitelist"("proyectoId", "email");

-- AddForeignKey
ALTER TABLE "public"."participantes_whitelist" ADD CONSTRAINT "participantes_whitelist_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participantes_whitelist" ADD CONSTRAINT "participantes_whitelist_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "public"."participantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participantes_whitelist" ADD CONSTRAINT "participantes_whitelist_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
