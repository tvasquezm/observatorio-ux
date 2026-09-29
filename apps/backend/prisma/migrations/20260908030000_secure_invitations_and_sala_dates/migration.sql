-- La invitación es una credencial aleatoria: nunca se almacena en texto plano.
ALTER TABLE "participantes_whitelist"
ADD COLUMN "codigoInvitacionHash" TEXT;

-- Las fechas de una sala son datos consultables, no parte del texto libre.
ALTER TABLE "Sala"
ADD COLUMN "fechaInicio" TIMESTAMP(3),
ADD COLUMN "fechaFin" TIMESTAMP(3);
