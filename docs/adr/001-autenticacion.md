# ADR-001 · Separar el acceso del equipo y de los participantes

**Estado:** vigente al 2 de noviembre de 2026.

## Contexto

Estudiantes, docentes y administradores trabajan con cuentas institucionales o locales. Un participante externo necesita responder un estudio por invitación, sin adquirir permisos sobre los proyectos del equipo. Ambos recorridos pueden abrirse en el mismo navegador.

## Decisión

La aplicación web inicia la sesión del equipo con contraseña o, si está configurado, con Google. El servidor emite un JWT firmado con `JWT_SECRET` en la cookie HttpOnly `evaluadorToken`. La web valida la sesión con `GET /api/auth/me`. En las escrituras autenticadas por cookie, el cliente envía el valor de `csrfToken` en la cabecera `x-csrf-token`. La estrategia del evaluador también admite Bearer para clientes de la API.

Al abrir el enlace público, el participante obtiene una sesión anónima del proyecto. La API comprueba el consentimiento al ingresar al estudio de Card Sorting. Su JWT usa otro secreto, `JWT_PARTICIPANTE_SECRET`, e incluye la identidad del participante y el proyecto. La web lo conserva en `sessionStorage` y lo envía como Bearer. La API usa una estrategia y un guard específicos. Una vez identificado el actor, los servicios comprueban el acceso al recurso solicitado.

## Consecuencias

Una invitación permite participar sin abrir el panel del investigador. Las credenciales de los dos recorridos se validan con claves distintas. En operación se deben configurar ambas claves, mantener las cookies seguras en producción y conservar la protección CSRF en el cliente web. Cambiar de perspectiva en la interfaz conserva el rol real de la cuenta.

[Controlador de acceso](../../apps/backend/src/modules/auth/auth.controller.ts) · [Estrategia del evaluador](../../apps/backend/src/modules/auth/jwt.strategy.ts) · [Estrategia del participante](../../apps/backend/src/modules/auth/jwt-participante.strategy.ts) · [Protección CSRF](../../apps/backend/src/main.ts).
