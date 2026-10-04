-- CreateTable
CREATE TABLE "public"."card_sorting_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_sorting_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card_sorting_answers" (
    "id" TEXT NOT NULL,
    "participanteSesionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_sorting_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_sorting_questions_sessionId_orden_key" ON "public"."card_sorting_questions"("sessionId", "orden");

-- CreateIndex
CREATE INDEX "card_sorting_answers_questionId_idx" ON "public"."card_sorting_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "card_sorting_answers_participanteSesionId_questionId_key" ON "public"."card_sorting_answers"("participanteSesionId", "questionId");

-- AddForeignKey
ALTER TABLE "public"."card_sorting_questions" ADD CONSTRAINT "card_sorting_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."research_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_sorting_answers" ADD CONSTRAINT "card_sorting_answers_participanteSesionId_fkey" FOREIGN KEY ("participanteSesionId") REFERENCES "public"."research_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_sorting_answers" ADD CONSTRAINT "card_sorting_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."card_sorting_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
