# Arquitectura — Observatorio UX

Este documento registra las decisiones de arquitectura relevantes del proyecto, sprint a sprint. Cada entrada explica **qué se decidió**, **por qué**, **qué alternativas se descartaron** y **cómo funciona en la práctica**, para que el equipo (y evaluadores) puedan entender el razonamiento sin tener que reconstruirlo desde el código o el backlog.

---

## Sprint 1 — Base técnica estable + módulo Proyectos

Foco del sprint: dejar el monorepo (pnpm, NestJS + Prisma en backend) en un estado estable y funcional, con autenticación por roles (`RolesGuard`: ESTUDIANTE / DOCENTE / ADMIN) y el CRUD base de Proyectos operativo.

Decisiones clave:
- El secreto JWT se movió a `ConfigService` (`.env`), eliminando el hardcodeo previo.
- Se implementó `RolesGuard` como guard reutilizable para todos los módulos futuros, en vez de validar roles manualmente en cada controller.
- Se estandarizó `ParseUUIDPipe` en los parámetros de ruta de todos los módulos, para que un ID malformado devuelva 400 en lugar de 500.

*(Sección resumida — completar con más detalle si se requiere para la memoria del proyecto.)*

**Corrección post-auditoría (cierre real de A4 — endpoint `/auth/test-token`):** el endpoint no se removió, se gatea con `if (nodeEnv === 'production') throw NotFoundException()`. El riesgo real detectado: `NODE_ENV` tenía `.default('development')` en `env.validation.ts`, así que un despliegue que se olvidara de setear esa variable arrancaba igual, en modo `development`, dejando el endpoint de bypass de autenticación abierto sin que nadie lo notara. Se cambió a `.required()`: ahora la app no arranca si falta `NODE_ENV`, en vez de arrancar silenciosamente en el modo equivocado. Verificado con `env.validation.smoke.spec.ts`.

---

## Sprint 2 — Backends de Persona, Journey Map y Momentos Críticos

### 1. Decisión arquitectónica: modelo genérico `UxArtifact` en vez de 3 schemas separados

**Planteamiento original (backlog):** cada uno de los tres módulos de investigación —Persona, Journey Map y Momentos Críticos— iba a implementarse con su propio schema de Prisma, su propia migración, su propio service y su propio controller (tareas B1–B5, B6–B10 y B11–B15 respectivamente), siguiendo el mismo patrón ya usado en Card Sorting y Evaluación Heurística.

**Lo implementado:** un único modelo de datos, `UxArtifact`, con un campo polimórfico `tipo: TipoArtefacto` (enum con valores `PERSONA`, `JOURNEY_MAP`, `MOMENTOS_CRITICOS`) y un campo `contenido: Json` cuya forma se valida en tiempo de ejecución con schemas de Zod específicos por tipo. Sobre este modelo se construyó un único módulo, `ArtifactsModule` (controller + service + DTOs), que expone el CRUD, el versionado append-only y el bloqueo pesimista con TTL de forma compartida para los tres tipos.

**Motivación del cambio:**
- **Simplicidad frente a la complejidad real del dominio.** Los tres tipos comparten exactamente el mismo ciclo de vida (crear, versionar sin sobrescribir, bloquear mientras se edita), así que modelarlos como 3 entidades independientes agregaba complejidad estructural sin agregar valor.
- **Evitar redundancia y duplicación.** Con 3 schemas separados, la lógica de versionado y de bloqueo habría tenido que reimplementarse (o abstraerse después) 3 veces. El modelo genérico la centraliza en un solo lugar.
- **Optimización de tiempo de desarrollo.** Un módulo genérico bien probado cubre los 3 casos de uso, en vez de mantener 3 módulos, 3 suites de test y 3 migraciones en paralelo.
- La recomendación de este enfoque surgió de consultar varias herramientas de IA sobre el diseño; el equipo evaluó las razones anteriores y decidió adoptarlo.

**Trade-off aceptado:** la validación específica de cada tipo de artefacto ya no vive en el schema de la base de datos (no hay una tabla `personas` con columnas propias tipadas), sino en la capa de aplicación, vía Zod (`PersonaSchema`, `JourneyMapSchema`, `MomentosCriticosSchema`). La integridad de la forma del `contenido` depende de que el service siempre pase por la validación correspondiente — no la garantiza la base de datos por sí sola.

**Estado:** las tareas B1–B15 del backlog original quedaron cubiertas por esta implementación única (`ArtifactsModule`), aunque no siguieron el desglose original tarea por tarea de cada módulo.

---

### 2. Versionado append-only

**Qué es:** cada vez que se edita un artefacto (Persona, Journey Map o Momentos Críticos), no se sobrescribe el registro existente. En vez de eso, se crea una fila nueva en `UxArtifact` con un número de versión incrementado, y las versiones anteriores quedan intactas en la base de datos.

**Cómo funciona (mecanismo):**
- Todas las versiones de un mismo artefacto comparten el mismo `artefactoLogicoId` (un UUID que identifica "el artefacto" como concepto, independiente de cuántas versiones tenga).
- El campo `version` (entero) se incrementa en cada edición: la primera versión nace con `version: 1`.
- Al crear una nueva versión, el service busca la versión más alta existente para ese `artefactoLogicoId` (`findFirst` ordenado por `version: 'desc'`) y crea la siguiente (`latest.version + 1`), en vez de hacer un `update`.
- Existe una restricción de unicidad `@@unique([artefactoLogicoId, version])` a nivel de base de datos, que impide que dos versiones del mismo artefacto lógico compartan número de versión — la integridad del historial no depende solo de la lógica de la aplicación.
- El `tipo` de una nueva versión siempre se hereda del artefacto lógico ya existente, no del payload que envía el cliente — así se evita que alguien "cambie de tipo" un artefacto a mitad de su historial de versiones.

**Por qué se decidió así:** el objetivo es preservar el historial completo de cómo evolucionó un artefacto de investigación (por ejemplo, cómo cambió el Journey Map a medida que se refinaba con más evidencia). Sobrescribir el registro perdería esa trazabilidad, que es valiosa tanto para el proceso de investigación UX como para poder auditar o revertir cambios.

---

### 3. Bloqueo pesimista con TTL (Time To Live)

**Qué es:** un mecanismo para evitar que dos personas editen la misma versión de un artefacto al mismo tiempo y una sobrescriba el trabajo de la otra sin darse cuenta.

**Cómo funciona (mecanismo):**
- El modelo `UxArtifact` tiene dos campos para esto: `lockedById` (quién tiene el bloqueo) y `lockedUntil` (hasta cuándo es válido ese bloqueo).
- Cuando alguien intenta crear una nueva versión (`createVersion`), el service revisa: si `lockedById` pertenece a **otro** usuario y `lockedUntil` todavía no ha pasado (`lockedUntil > new Date()`), la operación se rechaza con un `409 Conflict` ("El artefacto está bloqueado por otro usuario").
- Si el bloqueo ya expiró (`lockedUntil` en el pasado) o si el usuario que intenta editar es el mismo que tiene el lock, la operación procede con normalidad.
- El TTL evita el problema clásico del bloqueo pesimista "duro": si alguien bloquea un artefacto y luego cierra el navegador sin liberar el lock explícitamente, el bloqueo expira solo después de un tiempo, en vez de dejar el artefacto bloqueado indefinidamente.

**Por qué se decidió así:** en un contexto de investigación colaborativa (varios estudiantes/evaluadores pueden trabajar sobre el mismo proyecto), el riesgo de que dos personas editen el mismo artefacto simultáneamente y una pierda su trabajo es real. Un bloqueo optimista (detectar el conflicto recién al guardar) se descartó a favor de uno pesimista con expiración automática, que avisa del conflicto *antes* de que la segunda persona invierta tiempo editando, sin el riesgo de bloqueos permanentes por sesiones abandonadas.

**Corrección post-auditoría (cierre real de B4/B9/B14):** la primera versión de este mecanismo solo tenía el lado de *lectura* del lock: `createVersion` sabía interpretar `lockedById`/`lockedUntil`, pero ningún endpoint los escribía, así que en la práctica el lock nunca se activaba. Se agregaron dos endpoints nuevos en `ArtifactsController`/`ArtifactsService`:
- `POST /projects/:proyectoId/artifacts/:artefactoId/lock` (`acquireLock`) — adquiere el lock sobre la **última versión** del artefacto lógico (no sobre la fila específica de la URL, para que el chequeo sea correcto aunque el cliente tenga abierta una versión vieja). Si el propio usuario ya lo tenía, lo renueva (soporta "heartbeats" desde el frontend mientras el usuario sigue editando). TTL configurable vía `ttlSegundos` en el body (tope 30 min), default 5 min.
- `DELETE /projects/:proyectoId/artifacts/:artefactoId/lock` (`releaseLock`) — libera el lock. Solo el dueño del lock o un ADMIN pueden liberarlo explícitamente; liberar un lock ya expirado es idempotente y no falla.

El frontend debe llamar a `acquireLock` al entrar a un formulario de edición y a `releaseLock` al salir (o dejar que expire el TTL como red de seguridad). Guardar una versión (`createVersion`) no libera el lock explícitamente: como cada versión nace en una fila nueva sin lock, el efecto práctico es el mismo.

---

### 4. Relación con el "ADR Master"

El encabezado de `schema.prisma` referencia un **ADR Master** ("Refleja el ADR Master: modelo dual, bloqueo pesimista, consentimiento") como la fuente de las decisiones de fondo que el schema implementa. Si ese ADR existe como documento aparte, debería enlazarse aquí; si todavía no se ha formalizado por separado, las secciones 1–3 de esta entrada cumplen ese rol mientras tanto y deberían migrarse a un ADR dedicado cuando el equipo formalice ese proceso.

### 5. Consolidación de rutas: un solo idioma (inglés)

**Qué se encontró:** `ProjectsController` y `ArtifactsController` tenían `@Controller([...])` con un array de dos prefijos, sirviendo la misma implementación bajo dos idiomas a la vez: `/api/projects` y `/api/proyectos` (y sus equivalentes `/artifacts` / `/artefactos`). No era una duplicación de código —un solo controller, un solo service— sino dos alias de URL para el mismo endpoint. `EvaluacionHeuristicaController` y `CardSortingController` no tenían este patrón: solo exponían su ruta en español/técnico único.

**Decisión:** el equipo decidió quedarse con **un solo idioma para toda la API: inglés**. Se quitó el alias en español de `ProjectsController` (`@Controller('projects')`) y `ArtifactsController` (`@Controller('projects/:proyectoId/artifacts')`). Rutas afectadas — dejan de existir `/api/proyectos/*` y `/api/proyectos/:proyectoId/artefactos/*`; siguen existiendo `/api/projects/*` y `/api/projects/:proyectoId/artifacts/*` (incluyendo `/lock` de B4/B9/B14).

**Pendiente para el equipo:** `EvaluacionHeuristicaController` (`proyectos/:proyectoId/evaluacion-heuristica/sesiones`) sigue en español y no tiene alias en inglés — no se tocó porque no era parte de la duplicación reportada, pero para consistencia con la decisión de este ítem, valdría la pena migrarlo también en un cambio aparte (afecta más superficie de API, conviene coordinarlo con quien consuma esas rutas).

---

## Cómo usar este documento

Al cerrar cada sprint, agregar una sección con: foco del sprint, decisiones clave tomadas, motivación, alternativas descartadas, mecanismo de funcionamiento y trade-offs aceptados. Priorizar registrar **decisiones que se desvían de lo planeado originalmente** (como el pivote de Sprint 2), ya que son las que más valor aportan para entender el proyecto más adelante.