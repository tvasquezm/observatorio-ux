-- Las técnicas que se analizan ahora se eligen por sala ("Sala"."tecnicasAnalizadas"); la columna por proyecto ya no se usa.
ALTER TABLE "proyectos" DROP COLUMN "tecnicasAnalizadas";
