## Integración de Card Sorting y Momentos Críticos (2026-10-05)

Se integra sobre `main` (4ec8ad6), con el PR #27 como origen del menú, contraste y validación, y el #28 de Tomás como origen de la entrada guiada y las vistas de Card Sorting. No requiere aceptar esos PR por separado.

### Revisión del plan de Tomás

`PLAN_APROBADO.md` se utilizó como referencia de comparación, no como una orden de ejecutar toda la auditoría de interfaz. Es acertado conservar `main` y combinar la interfaz de Tomás con la validación del #27. Se verificaron los ancestros reales: 33dd1e2 para #28 y bbab1e7 para #27.

- Se conserva el backend actual: caché, limpieza de salas, límites de categorías, Jest 30 y migraciones existentes.
- Se conservan privacidad y todos los campos de Journey Map, incluidos contexto, evidencia, actividades, dificultades y ganancias en el PDF.
- Se incorporan entrada por elemento o lista, selector abierto/cerrado/híbrido, progreso del participante, confirmación de envío, vistas Tarjetas/Categorías y exportaciones CSV/PDF.
- Se mantienen la configuración, la guía, el enlace del estudio y los análisis complementarios desplegables. La práctica local sigue excluida de los resultados.
- El umbral entre 50 y 95 % recalcula también las agrupaciones; la revisión detectó que en #28 podían seguir usando el consenso original. CSV y PDF reciben el mismo conjunto de datos que la pantalla.
- Se reutilizan los colores y dependencias actuales; los tokens de los componentes importados se vinculan al tema existente. No se incorpora la renovación de pantallas ajenas al alcance solicitado.
- La página de privacidad documenta también la preferencia local de alto contraste.
- La prueba con ambas sesiones presentes detectó que el cliente del participante enviaba también la cookie del evaluador. Se fija `credentials: 'omit'` en ese cliente para que la API use exclusivamente su Bearer, manteniendo los controles del backend. El recorrido completo verifica creación, consentimiento de prueba, clasificación, confirmación y resultados con la API real.

### Momentos críticos

El formulario valida el mismo contrato que la API, identifica los campos inválidos y conserva el contenido ante errores. Rechaza campos con solo espacios. El rol, descripción, causa y acciones son obligatorios, como ya exigía el servidor. Cada acción se escribe en una línea, conservando las comas que contiene.

La lista permite leer los incidentes sin permiso de edición, con detalle de causas y acciones. La búsqueda y el filtro de positivos/negativos se aplican también a la matriz accesible de impacto y frecuencia. La prioridad numérica existente (impacto × frecuencia, valores 1–3) se presenta como orientación: alta ≥6, media 3–4, baja 1–2. Un incidente positivo se muestra como oportunidad de refuerzo, nunca como problema urgente.

La edición espera el bloqueo antes de habilitar el guardado, mantiene la versión esperada y evita que una respuesta tardía cambie una edición cancelada. Se confirma el descarte de modificaciones y se evita cambiar de ficha mientras se edita. No se alteran datos ya guardados ni se requieren migraciones.

### Verificación

- `pnpm install --frozen-lockfile`: aprobado, sin nuevas dependencias.
- `pnpm --filter backend exec prisma generate`: cliente real generado.
- `pnpm build:all`: contratos, backend y frontend compilados.
- `pnpm --filter backend test -- --runInBand`: 250 pruebas aprobadas.
- `pnpm --filter frontend test --maxWorkers=2`: 228 pruebas aprobadas.
- `pnpm test:e2e`: 12 recorridos aprobados en Chromium de escritorio (1440 px) y móvil (390 px), con PostgreSQL real aislado. Incluyen creación, lectura y edición de momentos críticos, versionado, Card Sorting de principio a fin y ausencia de desbordamiento de página.
- Revisión visual en navegador: lista y formulario de momentos críticos, configuración de Card Sorting con alto contraste, creación de estudio con la API real y navegación. El menú abre con Enter y cierra con Escape devolviendo el foco.
- `pnpm audit --audit-level high`: sin vulnerabilidades conocidas.

La evaluación con profesores y usuarios sigue pendiente; estos controles no acreditan aceptación metodológica ni una auditoría integral de accesibilidad.
