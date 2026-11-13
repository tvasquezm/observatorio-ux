# Diagnóstico de configuración y accesos

Fecha: 2026-11-12. Revisión de código y pruebas; no reconstruye los eventos de producción de la prueba de usabilidad.

| Caso observado | Evidencia y estado | Corrección / siguiente paso |
|---|---|---|
| La opción de crear proyectos en una sala parece borrarse | **Confirmado en código:** el toggle copiaba el valor inicial a useState y no se resincronizaba; el listado de salas tampoco se invalidaba tras PATCH. Que esto explique el episodio de la prueba está **por verificar**. | Se muestra el valor guardado con un borrador local, estados Guardando/Guardado, invalidación de consultas y reversión ante error. |
| Un estudiante no puede entrar al sistema | **Confirmado:** AuthService exige una inscripción con el correo normalizado en una sala no eliminada y con fechaFin nula o vigente. | Revisar correo, inscripción, fecha de término y papelera de salas. No se relajan permisos. |
| Un estudiante no puede crear un proyecto | **Confirmado:** necesita salaId, habilitación de creación e inscripción por correo. | La interfaz explica cómo conseguir la habilitación; el servidor conserva el control. |
| Un docente no puede editar un proyecto de estudiante | **Confirmado:** ProjectsService rechaza esta edición con 403. La lectura puede estar permitida por pertenencia a la sala. | Se conserva la regla; lectura no implica permiso de edición. |
| Un docente no puede cambiar una sala ajena | **Confirmado:** PATCH valida dueño o administrador. | Se conserva y prueba con dueño, otro docente, estudiante y administrador. |
| Bloqueo mientras se usaba la plataforma | **Confirmado por el equipo en R14:** venció el token del evaluador. No se ha probado que una condición de inactividad causara el bloqueo. | Renovación y aviso corresponden a F8/F10; F5 no modifica autenticación. |
| Se pierde un formulario al salir | **Confirmado en código:** configuración, estudiantes/equipos y entrada de tarjetas no tenían protección completa de navegación. | Se reutiliza useUnsavedChanges; la sala coordina un único bloqueo para sus paneles. El texto de tarjetas aún no agregado también se detecta. |

El backend ya persistía permiteCreacionProyectos en PATCH /salas/:id. Se añaden pruebas de ese contrato y de sus permisos. No se cambian roles, inscripción ni duración de sesiones.

También se corrige el límite de integrantes: dejarlo vacío ahora envía null, que el modelo nullable y la validación IsOptional ya admitían. Se conservan IsInt y Min(1) para números; no hay migración.

Pendiente: contrastar estos flujos con registros del entorno real y los casos de la prueba. No atribuir un 403 a sesión vencida: la renovación se trata por separado.
