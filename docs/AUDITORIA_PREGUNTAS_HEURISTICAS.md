# Auditoría de las preguntas heurísticas (F41, primera entrega)

Fecha: 2026-11-22 · Catálogo: `packages/shared-types/src/domains/heuristica-metodologias.ts` (13 familias, 450 preguntas).
Esta entrega **solo informa**: no se borró ni se cambió ninguna pregunta. Las evaluaciones ya guardadas conservan su copia de la metodología (D6), así que cualquier corrección futura solo afecta a evaluaciones nuevas.

## Cómo se revisó

1. **Contexto filtrado de la plataforma:** se buscaron en el texto de cada pregunta, su descripción y los enunciados de sección palabras propias del Observatorio (sala, proyecto, docente, estudiante, participante, Card Sorting, rol, bloqueo, versión, plataforma…).
2. **Comparación con la fuente:** para Nielsen (la familia señalada por el usuario) y Shneiderman se leyeron las páginas citadas en el catálogo y se clasificó cada pregunta como *respaldada*, *parcial* (la idea está, pero la pregunta agrega un detalle que la fuente no dice) o *no está en la fuente*.

Importante: ninguna de estas fuentes trae preguntas. Son listas de principios; el catálogo los convierte en preguntas verificables (el propio catálogo las marca como «paráfrasis operativa de la plataforma»). Por eso es esperable que haya preguntas *parciales*; lo que no debería haber son ideas ajenas a la fuente o ejemplos de la plataforma.

## Hallazgos

### 1. Ejemplos de la plataforma que se colaron en las preguntas (corregir)

| Familia | Pregunta | Problema |
|---|---|---|
| Nielsen · Lenguaje del usuario | P8 «¿Las metáforas y nombres del producto (por ejemplo **sala, proyecto, carpeta**) coinciden…?» · descripción: «…una persona **docente, estudiante o participante**» | La idea (conceptos y modelos mentales del usuario) sí es de Nielsen, pero los ejemplos son del Observatorio. Para un producto ajeno (un banco, una tienda) la pregunta confunde. |
| WCAG 2.2 · 3.3.4 | P41 «¿Los envíos definitivos (por ejemplo **entregar un Card Sorting o una revisión**)…?» y P42 (misma descripción) | El criterio de WCAG habla de envíos con consecuencias legales, financieras o de datos; el ejemplo es de la plataforma. |

**Propuesta:** quitar los ejemplos propios y dejar ejemplos neutros (Nielsen P8: «por ejemplo carrito, bandeja de entrada, carpeta»; WCAG P41-42: «por ejemplo pagos, compras o envío de formularios con datos personales»).

### 2. Nielsen: preguntas cuya idea no está en la fuente

Página revisada: nngroup.com/articles/ten-usability-heuristics (revisión del 2024-01-30). Resultado: **22 respaldadas, 15 parciales, 3 fuera de la fuente.**

| Pregunta | Sección | Por qué |
|---|---|---|
| P12 «¿Al volver atrás o cancelar se conservan los datos ya ingresados?» | Control y salida | Nielsen habla de salida de emergencia y deshacer/rehacer, no de conservar datos. (Sí aparece en Shneiderman, regla 5: no obligar a reescribir.) |
| P36 «¿Al corregir el error se conserva lo ya ingresado?» | Recuperación | Igual que P12: está en Shneiderman, no en Nielsen. |
| P40 «¿El contenido de ayuda está al día con el producto actual?» | Ayuda | La heurística 10 no dice nada sobre la vigencia de la ayuda. |

**Propuesta:** retirar P12, P36 y P40 de Nielsen (o moverlas a Shneiderman, donde P12 y P36 sí tienen respaldo) y quedar con 37 preguntas; o reemplazarlas por preguntas que sí estén en el texto (por ejemplo, en Ayuda: «¿La ayuda es breve y se centra en la tarea?»). Las 15 parciales se pueden mantener; las más alejadas son P2 (indicadores de progreso), P25 (acciones masivas) y P34 («en qué lugar»).

### 3. Shneiderman

Página revisada: cs.umd.edu/users/ben/goldenrules.html (6.ª edición). Las 8 reglas cubren consistencia, usabilidad universal, retroalimentación, diálogos con cierre, prevención de errores, reversión fácil, control del usuario y memoria de corto plazo. La búsqueda de contexto de plataforma no encontró filtraciones. Pendiente: comparar sus 24 preguntas una por una (no se hizo en esta entrega).

### 4. Familias propias, sin fuente externa (decisión del usuario: se revisan aparte, no se borran)

- **Observatorio UX: criterios propios** (16 preguntas): hablan de roles, bloqueos, historial de versiones, salas y proyectos del Observatorio. Son válidas para evaluar *esta* plataforma, pero no sirven para un producto externo. **Propuesta:** dejarla fuera de la biblioteca por defecto o renombrarla «Solo para evaluar el Observatorio UX».
- **Rúbrica UTEM** (22 preguntas): la fuente citada es la portada de utem.cl, que no contiene la rúbrica. **Propuesta:** citar el documento real del curso (programa o rúbrica en PDF) o marcarla como «rúbrica del curso».

### 5. Familias sin verificar contra su fuente

Sin filtraciones de contexto en la búsqueda automática, pero falta la comparación pregunta por pregunta:

| Familia | Preguntas | Fuente | Acceso |
|---|---|---|---|
| Tognazzini | 46 | asktog.com | abierta |
| Bastien y Scapin | 36 | inria.hal.science | abierta (PDF) |
| Gerhardt-Powals | 30 | tandfonline.com | de pago |
| Hassan Montero y Martín (2) | 33 + 71 | nosolousabilidad.com | abierta |
| Bertini et al. | 26 | doi.org (ACM) | de pago |
| WCAG 2.2 | 46 | w3.org | abierta |
| COGA 2021 | 24 | w3.org | abierta |
| Amershi et al. | 36 | microsoft.com | abierta |

Las de pago requieren el artículo (biblioteca UTEM) para verificarse.

## Qué se necesita decidir

1. ¿Se aplican las correcciones de la sección 1 (ejemplos neutros en Nielsen P8 y WCAG P41-42)?
2. ¿Qué hacer con Nielsen P12, P36 y P40: retirarlas, moverlas a Shneiderman o reemplazarlas?
3. ¿Se continúa con la comparación de las familias de la sección 5?

Al aplicar cambios hay que actualizar `catalogo.test.ts` (fija la cantidad de preguntas por familia).
