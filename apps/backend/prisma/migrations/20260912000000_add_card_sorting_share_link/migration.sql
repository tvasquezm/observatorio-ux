ALTER TABLE "research_sessions" ADD COLUMN "enlaceParticipanteHash" TEXT;
CREATE UNIQUE INDEX "research_sessions_enlaceParticipanteHash_key" ON "research_sessions"("enlaceParticipanteHash");
