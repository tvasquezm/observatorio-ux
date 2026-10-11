# Contrato de integración del flujo

Los tipos están en `packages/shared-types/src/domains/heuristica-flujo.ts`. API: `/projects/:proyectoId/evaluacion-heuristica` (prefijo global `/api`). Todas las rutas exigen JWT/roles existentes y acceso al proyecto de la URL; nunca se acepta una evaluación de otro proyecto.

JSON admite hasta 5 MB por petición; superar ese límite devuelve 413. `avanceEquipo` ofrece a coordinador y expertos únicamente nombres, fechas de entrega/guardado y cantidad de criterios completados; no incluye valoraciones ni hallazgos individuales y se omite para lectores.

## Biblioteca/equipo

- GET `/metodologias` → `MetodologiaFlujo[]` (catálogo original + copias del usuario autenticado).
- POST `/metodologias` body `MetodologiaFlujo` → copia propia nueva, `protegida:false`, id/autor desde servidor. Los originales no se modifican.
- GET `/equipo` → `MiembroEquipoFlujo[]` (dueño, miembros, docente de sala y usuario actual si autorizado). Evaluadores/lectores deben pertenecer a esta lista.

## Evaluaciones

- GET `/evaluaciones` → `EvaluacionFlujo[]`, filtradas por rol en el flujo y sin respuestas ajenas.
- POST `/evaluaciones` body `ConfiguracionFlujo` → `EvaluacionFlujo` BORRADOR. Guardar borrador permite alcance pendiente; iniciar revalida completitud.
- GET `/evaluaciones/:id` → `EvaluacionFlujo` filtrada.
- PATCH `/evaluaciones/:id/configuracion` body `{revision, configuracion:ConfiguracionFlujo}` → evaluación. Solo coordinador en BORRADOR.
- POST `/evaluaciones/:id/iniciar` body `{revision}` → evaluación. Fija snapshot, crea trabajos para 1–5 expertos.
- PATCH `/evaluaciones/:id/trabajo` body `{revision, respuestas:RespuestaCriterio[], hallazgos:HallazgoFlujo[]}` → evaluación. Solo trabajo del usuario; borradores admiten campos pendientes pero entregas/hallazgos guardados se validan al entregar. Serializar actualizaciones con bloqueo de fila; revision desactualizada = 409, cliente conserva borrador.
- POST `/evaluaciones/:id/entregar` body `{revision}` → evaluación. Exige criterios valorados o NA justificado y hallazgos válidos; no puede volver a editar tras entregar. Todas las entregas → PENDIENTE_CONSENSO.
- PATCH `/evaluaciones/:id/consenso` body `{revision, criterios:DecisionCriterio[], hallazgos:DecisionHallazgo[]}` → evaluación. Coordinador o experto puede editar durante consenso. Toda escritura invalida aprobadoPor.
- POST `/evaluaciones/:id/aprobar` body `{revision}` → evaluación. Solo experto confirma consenso completo y fuentes sin omisión, incluye caso único.
- POST `/evaluaciones/:id/consolidar` body `{revision}` → evaluación. Solo coordinador, todas las decisiones completas y todos los expertos aprobaron.
- POST `/evaluaciones/:id/finalizar` body `{revision}` → evaluación. Solo coordinador CONSOLIDADA; fija snapshot InformeFlujo y fase FINALIZADA.
- POST `/evaluaciones/:id/version` body `{revision}` → nuevo borrador. Solo coordinador desde FINALIZADA. Copia configuración, version incrementada, anteriorId=id; no copia respuestas ni acuerdos.

## Capturas

- POST `/evaluaciones/:id/evidencias` multipart `archivo` → `EvidenciaFlujo`, PNG/JPEG/WebP ≤2MB, bytes comprobados, 50 máx por experto, solo experto editable.
- GET `/evaluaciones/:id/evidencias/:evidenciaId` → Blob original con auth y Cache-Control private/no-store.
- GET `/evaluaciones/:id/evidencias/:evidenciaId/meta` → `EvidenciaFlujo`.
- PATCH `/evaluaciones/:id/evidencias/:evidenciaId` body `{revision, anotaciones:AnotacionEvidencia[]}` → `EvidenciaFlujo`. Revisión propia de la captura (devuelta en upload/meta/PATCH), 409 si cambió. Solo autor antes de entregar; coordenadas normalizadas [0,1], tipo/cantidad/texto/color validados, no altera bytes originales.
- Una referencia en trabajo debe corresponder a captura del mismo autor/evaluación. Individual: solo autor; consenso: expertos/coordinador pueden ver; lector: solo evidencias aceptadas incluidas en informe consolidado/final. Metadatos y anotaciones siguen mismos permisos.

## Comparación

- GET `/evaluaciones/:id/comparacion/:previaId` → `ComparacionFlujo` calculando compatibilidad y devolviendo vínculos guardados si existen; exige ambas FINALIZADAS, mismo proyecto/producto y lector autorizado en ambas.
- PATCH `/evaluaciones/:id/comparacion` body `{revision, previaId, vinculos:VinculoComparacion[]}` → evaluación con comparación confirmada, solo coordinador. No modifica informe final. No se infiere solucionado por ausencia; exige justificación y confirmación humana. Revalidar compatibilidad del lado servidor y permitir estados comparativos solo cuando alcance/escala/criterios coinciden; incompatible admite NO_COMPARABLE/NO_VERIFICADO.

Métricas compartidas: `resumirEvaluacion(configuracion, consenso)` devuelve `evaluados, pendientes, noAplica, porCategoria:[{id,etiqueta,count}], porSeveridad:number[5], totalHallazgos, indice:number|null, denominador:number, formula:string|null`. Solo hallazgos ACEPTADOS se cuentan una vez. `comprobarCompatibilidad(anterior:ConfiguracionFlujo, actual:ConfiguracionFlujo)` devuelve `{compatible:boolean,motivos:string[]}`. `detectarDiscrepancias(configuracion, trabajos)` devuelve criterios con valores/aplicabilidad distintos y hallazgos no compartidos, como agenda informativa sin decidir el acuerdo.
