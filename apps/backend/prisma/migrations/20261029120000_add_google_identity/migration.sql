ALTER TABLE "usuarios" ADD COLUMN "googleSubject" TEXT;
CREATE UNIQUE INDEX "usuarios_googleSubject_key" ON "usuarios"("googleSubject");
