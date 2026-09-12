-- AlterTable
ALTER TABLE "public"."Sala" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."proyectos" ADD COLUMN     "deletedAt" TIMESTAMP(3);
