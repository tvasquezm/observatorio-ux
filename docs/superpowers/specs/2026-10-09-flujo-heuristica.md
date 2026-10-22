# Flujo completo de evaluación heurística

Fuente funcional: `D:/Modulo Evaluacion Heuristica.pptx`, 19 diapositivas. El usuario eligió implementar todo el recorrido y pidió un PR antes de integrar o activar los cambios. Rama: `flujo-de-heuristica`.

## Diseño

Actualización del 19 de octubre: la simplificación se aplica directamente a los componentes del módulo existente. La configuración reúne producto y metodología con vista previa; la revisión ofrece respuestas visibles, mapa de preguntas y un resumen del equipo en el mismo espacio. Se conserva el guardado real, los permisos y los borradores al cambiar de vista.

La técnica nueva comparte ruta de pantalla con la actual; las sesiones existentes se conservan en una sección de evaluaciones anteriores. El nuevo recorrido usa tablas propias, sin reinterpretar ni borrar ResearchSession.resultado. React, TanStack Query, NestJS, Prisma y PostgreSQL existentes, sin nuevas dependencias.

Cada evaluación contiene una copia versionada de producto, alcance, criterios y escala. El coordinador configura y cierra; 1–5 expertos registran y entregan respuestas independientes. Los lectores autorizados solo acceden al consolidado. Las escrituras se serializan y exigen revisión para impedir sobrescrituras. El servidor filtra trabajos y capturas por autor durante la evaluación, incluso para el coordinador.

Estados: BORRADOR → EN_EVALUACION → PENDIENTE_CONSENSO → CONSOLIDADA → FINALIZADA. La creación actual comienza directamente en EN_EVALUACION; los borradores antiguos siguen disponibles. Iniciar fija la configuración. Entregar exige que cada criterio tenga valoración o «No aplica», sin valoración ni motivo obligatorio. Sin evaluar, no aplica y sin hallazgos son distintos. Entregar no equivale a consolidar.

Consenso manual: se revisan criterios y se vinculan hallazgos de origen. Todos los hallazgos individuales quedan aceptados, fusionados o descartados con motivo, sin perder sus originales. Todos los expertos confirman la propuesta vigente; editar invalida las aprobaciones. Ningún promedio ni mayoría decide el acuerdo. Un experto también confirma su revisión. Solo el coordinador consolida con todas las entregas, decisiones y aprobaciones, y luego fija el informe al finalizar.

Biblioteca: seis conjuntos iniciales y cuatro complementos del PPT con autoría, enlaces y versión de fuente verificables. La configuración estudiantil solo permite seleccionar una metodología, con sus respuestas ya definidas. Los originales son inmutables y las copias y escalas previamente guardadas conservan su origen y definición. Escalas categóricas, ordinales, numéricas y cualitativas tienen etiquetas, significado y sentido. Solo escala numérica con regla explícita admite índice ponderado, mostrando fórmula y denominador; severidad ordinal solo distribución, nunca promedio universal. WCAG y COGA no se anuncian como certificación de conformidad.

Hallazgos múltiples por criterio, con título y descripción requeridos. Contexto, recomendación, notas y capturas son opcionales; se conservan severidad separada y prioridad. Anotaciones no destructivas (rectángulo, círculo, flecha, destacado y texto) editables y con deshacer; se conserva imagen original. Se revalida contenido, tamaño y permisos al subir, leer o editar.

Guardado: autoguardado secuencial y botón Guardar, estado visible, recuperación al retomar y protección de borradores ante fallo o navegación. No se entrega trabajo durante una escritura pendiente.

Informe reproducible: contexto, fuente, escala, cobertura, distribución, decisiones, problemas únicos, recomendaciones, evidencias y aprobaciones; solo el consolidado determina sus métricas. PDF con anotaciones, sin hacer pasar un borrador por final. Nuevas revisiones crean evaluaciones independientes, conservando el informe anterior.

Comparación: dos evaluaciones finalizadas del mismo producto; verificar criterios, escala y alcance antes de comparar. Los vínculos y estados se confirman manualmente con justificación. Ausencia de un problema no implica solucionado. Sin correspondencia confirmada, no verificado. Si cambia el alcance o escala sin equivalencia, no comparable.

## Validación

Probar uno y cinco expertos, independencia y lectores, acceso a capturas, modificaciones concurrentes, escalas y pesos inválidos, todo no aplica, pendientes, hallazgos múltiples, consenso incompleto, invalidación de aprobaciones, informe inmutable, recuperación y fallo de guardado, comparación incompatible y solucionado sin verificación. Ejecutar pruebas existentes y nuevas, builds frontend/backend y recorrido real en base aislada. No aplicar migraciones a la base del usuario antes del PR/revisión.
