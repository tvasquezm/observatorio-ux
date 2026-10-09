-- CreateTable
CREATE TABLE "public"."evidencias_heuristica" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "datos" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_heuristica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidencias_heuristica_sesionId_idx" ON "public"."evidencias_heuristica"("sesionId");

-- AddForeignKey
ALTER TABLE "public"."evidencias_heuristica" ADD CONSTRAINT "evidencias_heuristica_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "public"."research_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
