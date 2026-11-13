# CIERRE FASE F2

Fecha: 2026-11-12

Hecho:
- Un formulario de creación compartido en Proyectos y Sala; sala fija al crear desde ella.
- Todas las perspectivas eligen sala en /proyectos; estudiante ve las habilitadas, docente las propias, administrador todas.
- Sin opciones, se explica cómo conseguir una sala y se enlaza a /salas.
- Proyectos antiguos siguen visibles/editables, con «Sin sala» y acceso a la vinculación existente.
- Técnicas accesibles también desde el menú del resumen. Inicio del evaluador explica Sala → Proyecto → Técnica.
- Terminología visible clasificada en `F2_TERMINOLOGIA.md` (43 textos más mensajes de validación del formulario).

Archivos tocados: formulario compartido y controlador de creación desde sala, ProjectsPage, SalaDetallePage, hooks de proyectos, ProjectDetailLayout, DashboardPage, textos de card sorting/onboarding/analítica/participantes y sus pruebas.

Contratos reales:
- POST /projects conserva { nombre, descripcion?, salaId? }. Backend solo exige sala a ESTUDIANTE; DOCENTE/ADMIN sin sala siguen válidos.
- La UI siempre envía salaId. Crear invalida `['projects']` y `['salas', salaId, 'proyectos']`; la lista de la sala muestra el proyecto al recibirlo.
- Backend verifica inscripción por email normalizado, habilitación y ownership; no necesitó cambios de producto.
- OnboardingPage es del participante: la explicación de jerarquía se ubica en DashboardPage.
- Las pestañas de sala ocultan el formulario de creación sin desmontarlo: su borrador no se pierde al cambiar pestaña.

Desvíos: por compartir las mismas líneas, formulario/selector obligatorio/indicador de huérfanos se agrupan en un commit; no se crean rutas, endpoints ni migraciones. El vínculo lleva al formulario existente de salas, como permite el plan. Se conservan textos legales y usos académicos de «estudio».

Verificación:
```text
Tests nuevos de /proyectos: 3 fallos esperados antes del cambio; verdes después.
pnpm --filter backend test projects.service --runInBand:
Test Suites: 1 passed; Tests: 25 passed
Incluye estudiante sin sala, inscrito/habilitado, deshabilitado, no inscrito;
docente dueño/no dueño, administrador en sala ajena y docente sin sala.
pnpm --filter frontend test: 73 archivos, 730 pruebas aprobadas
pnpm --filter frontend build: built in 651ms; exit 0
pnpm --filter backend build: nest build; exit 0
Chromium, API simulada: docente y estudiante crean desde sala en claro/oscuro.
Las cuatro peticiones incluyen salaId=s1 y el proyecto aparece en la sala.
Estudiante con permiso desactivado: botón ausente.
```

Capturas / evidencia manual: `evidencias/F2` (375 px claro y 1280 px oscuro, formulario con sala fija). `verificacion.json` registra los payloads sin credenciales.

Pendientes: revisión humana de permisos con API/base de datos reales antes de producción. No se modificó ni migró ningún proyecto existente.
