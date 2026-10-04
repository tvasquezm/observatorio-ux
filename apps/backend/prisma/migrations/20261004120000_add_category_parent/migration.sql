-- AlterTable
ALTER TABLE "public"."categories" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "public"."categories"("parentId");

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
