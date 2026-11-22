-- F36: los participantes son anónimos (acceso abierto por enlace/QR); se
-- retiran las invitaciones por correo y la tabla que guardaba sus correos.
-- Irreversible: respaldar la tabla con pg_dump antes de aplicar en producción.
DROP TABLE IF EXISTS "participantes_whitelist";
