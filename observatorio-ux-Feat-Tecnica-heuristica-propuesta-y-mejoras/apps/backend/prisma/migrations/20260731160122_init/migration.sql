-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('ESTUDIANTE', 'DOCENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TipoSesion" AS ENUM ('CARD_SORTING', 'EVALUACION_HEURISTICA');

-- CreateEnum
CREATE TYPE "public"."EstadoSesion" AS ENUM ('INVITADO', 'EN_PROGRESO', 'COMPLETADO', 'ABANDONADO');

-- CreateEnum
CREATE TYPE "public"."ActorSesion" AS ENUM ('PARTICIPANTE', 'EVALUADOR');

-- CreateEnum
CREATE TYPE "public"."TipoArtefacto" AS ENUM ('PERSONA', 'JOURNEY_MAP', 'MOMENTOS_CRITICOS');

-- CreateTable
CREATE TABLE "public"."proyectos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "public"."Rol" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."participantes" (
    "id" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consentimientos" (
    "id" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "aceptado" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "ipRegistro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."research_sessions" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" "public"."TipoSesion" NOT NULL,
    "estado" "public"."EstadoSesion" NOT NULL DEFAULT 'INVITADO',
    "actor" "public"."ActorSesion" NOT NULL,
    "participanteId" TEXT,
    "evaluadorId" TEXT,
    "resultado" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoAt" TIMESTAMP(3),

    CONSTRAINT "research_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ux_artifacts" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" "public"."TipoArtefacto" NOT NULL,
    "artefactoLogicoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contenido" JSONB NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "ux_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE INDEX "research_sessions_proyectoId_tipo_idx" ON "public"."research_sessions"("proyectoId", "tipo");

-- CreateIndex
CREATE INDEX "ux_artifacts_artefactoLogicoId_version_idx" ON "public"."ux_artifacts"("artefactoLogicoId", "version");

-- AddForeignKey
ALTER TABLE "public"."proyectos" ADD CONSTRAINT "proyectos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consentimientos" ADD CONSTRAINT "consentimientos_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "public"."participantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."research_sessions" ADD CONSTRAINT "research_sessions_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."research_sessions" ADD CONSTRAINT "research_sessions_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "public"."participantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."research_sessions" ADD CONSTRAINT "research_sessions_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ux_artifacts" ADD CONSTRAINT "ux_artifacts_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ux_artifacts" ADD CONSTRAINT "ux_artifacts_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
