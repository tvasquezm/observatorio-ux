-- F35: la administración puede desactivar cuentas sin borrar sus datos.
ALTER TABLE "usuarios" ADD COLUMN "desactivadoEn" TIMESTAMP(3);
