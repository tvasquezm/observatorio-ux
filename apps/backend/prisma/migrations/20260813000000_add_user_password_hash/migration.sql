-- Add credentials for evaluator login while keeping existing users migratable.
ALTER TABLE "public"."usuarios"
ADD COLUMN "passwordHash" TEXT;
