/*
  Warnings:

  - A unique constraint covering the columns `[artefactoLogicoId,version]` on the table `ux_artifacts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."TipoCardSorting" AS ENUM ('ABIERTO', 'CERRADO');

-- DropIndex
DROP INDEX "public"."ux_artifacts_artefactoLogicoId_version_idx";

-- AlterTable
ALTER TABLE "public"."research_sessions" ADD COLUMN     "estudioId" TEXT,
ADD COLUMN     "tipoCardSorting" "public"."TipoCardSorting";

-- CreateTable
CREATE TABLE "public"."cards" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPredefinida" BOOLEAN NOT NULL DEFAULT true,
    "creadaPorParticipanteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card_groupings" (
    "id" TEXT NOT NULL,
    "participanteSesionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_groupings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cards_sessionId_idx" ON "public"."cards"("sessionId");

-- CreateIndex
CREATE INDEX "categories_sessionId_idx" ON "public"."categories"("sessionId");

-- CreateIndex
CREATE INDEX "card_groupings_categoryId_participanteSesionId_idx" ON "public"."card_groupings"("categoryId", "participanteSesionId");

-- CreateIndex
CREATE UNIQUE INDEX "card_groupings_participanteSesionId_cardId_key" ON "public"."card_groupings"("participanteSesionId", "cardId");

-- CreateIndex
CREATE INDEX "research_sessions_estudioId_idx" ON "public"."research_sessions"("estudioId");

-- CreateIndex
CREATE UNIQUE INDEX "ux_artifacts_artefactoLogicoId_version_key" ON "public"."ux_artifacts"("artefactoLogicoId", "version");

-- AddForeignKey
ALTER TABLE "public"."research_sessions" ADD CONSTRAINT "research_sessions_estudioId_fkey" FOREIGN KEY ("estudioId") REFERENCES "public"."research_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cards" ADD CONSTRAINT "cards_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."research_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."research_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_creadaPorParticipanteId_fkey" FOREIGN KEY ("creadaPorParticipanteId") REFERENCES "public"."participantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_groupings" ADD CONSTRAINT "card_groupings_participanteSesionId_fkey" FOREIGN KEY ("participanteSesionId") REFERENCES "public"."research_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_groupings" ADD CONSTRAINT "card_groupings_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_groupings" ADD CONSTRAINT "card_groupings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
