# Formulario compacto de evaluación heurística — Implementation Plan

## Estado vigente · 17 de octubre de 2026

La pauta posterior del usuario reemplaza el formulario de cuatro tareas de las primeras iteraciones. El módulo y el prototipo ahora muestran producto y selección de metodología en un recuadro inicial; comenzar abre directamente las preguntas. No se ofrece crear métodos, combinar preguntas ni personalizar escalas. Las metodologías y escalas ya guardadas se conservan al leer evaluaciones anteriores.

Los datos descriptivos (URL, objetivo, versión, dispositivo, tareas, pantallas y recomendaciones de problemas) son opcionales. Se conservan los datos mínimos que identifican la revisión, el equipo del proyecto y título/descripción/pregunta de cada problema. Por la corrección posterior del usuario, «No aplica» completa la pregunta sin valoración ni motivo; esta regla también se usa en progreso, entrega, consenso e informes. Las explicaciones antiguas se conservan. El servidor mantiene permisos, límites, evidencias, control de revisiones y aprobación del equipo.

El acuerdo se presenta con pestañas en el mismo espacio; los editores permanecen montados para conservar borradores y capturas. Los pendientes se resumen y permiten ir a corregirlos. La barra lateral comienza abierta y recuerda el cierre manual, sin cerrarse por navegar o hacer clic en el contenido.

Pendiente de aclaración: los nombres que corresponden a la numeración externa «3, 5, 6, 9 y 10». Toda la configuración se reunió en el recuadro inicial, pero no se alteraron las reglas de aprobación/finalización suponiendo qué significan «9 y 10».

Las regresiones del prototipo se ejecutan con `pnpm --filter frontend test src/features/heuristica-flujo/prototipo/PrototipoHeuristicaPage.test.tsx`. La comprobación visual de navegador se realizó localmente; sus capturas y scripts temporales no forman parte del PR. La verificación con base PostgreSQL requiere recuperar Docker: el 17 de octubre no arrancó por un error de acceso a `docker-secrets-engine/engine.sock`. La vista local se sirve directamente con Vite en el puerto 5173; no se restableció Docker ni se modificaron datos de proyectos.

Tras la corrección visual del usuario, el prototipo usa una estructura nueva: configuración con vista previa, mapa de preguntas y respuestas como opciones visibles, con «No aplica» en el mismo grupo. El resumen del profesor muestra el avance del equipo a primera vista. Se mantienen una pregunta a la vez, notas opcionales, problemas en diálogo y pie de acciones. La comprobación de navegador reproduce teclado, conservación al navegar, diez «No aplica» sin motivos, entrega, privacidad, solo lectura y checklist de 71 preguntas; verifica ausencia de desborde a 320, 390, 768, 1024 y 1440 px. El cambio de distribución está en el prototipo local; no altera las pantallas reales adicionales.

Lo que sigue conserva como referencia los planes y resultados de las iteraciones anteriores.


## Prototipo local solicitado después del plan

El usuario pidió una demostración navegable local y confirmó «Formulario compacto». Se preparó la ruta de desarrollo `/prototipo/heuristica` con creación, borrador, inicio, vista del profesor, criterios individuales, aplicabilidad separada y hallazgos. Usa el catálogo real y datos de equipo de ejemplo; mantiene el estado solo mientras la página permanece abierta y no escribe en API ni base de datos. La ruta y su carga están condicionadas a `import.meta.env.DEV`.

Este prototipo permite revisar las pantallas anteriores y posteriores a la creación; no ejecuta la integración en las pantallas reales descrita en las tareas siguientes. Se reutiliza el checkout local en la rama `codex/prototipo-heuristica-local` para mostrarlo en el servidor existente. La implementación se verificó con pruebas unitarias y un recorrido de navegador; los resultados concretos se registran en `output/prototipo-heuristica-*.log` y `output/check-prototipo-heuristica.cjs`.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ejecutar en esta sesión; no se necesita delegación para este cambio.

**Goal:** Reunir los cuatro pasos de configuración en un solo recuadro, con las decisiones principales visibles y los detalles desplegables, reduciendo el desplazamiento sin perder funciones.

**Architecture:** Reorganizar `ConfiguracionEditor` y reutilizar sus controles y estado actuales. El mismo editor sirve para crear evaluaciones y editar borradores; sus acciones siguen perteneciendo a los contenedores actuales y se muestran dentro del recuadro mediante una prop opcional `actions`. Las API, los contratos y el guardado no cambian.

**Tech Stack:** React 19, TypeScript 5.9, CSS existente, Vitest/Testing Library y Playwright; pnpm 10.34.5, Node.js 24 o superior.

**Spec:** Opción «Formulario compacto» seleccionada por el usuario en la maqueta de esta conversación. Fuente visual: `C:/Users/xiino/.codex/visualizations/2026/10/16/01a145da-f2b9-7c40-8ee3-ad712a0a3eae/heuristica-compacta.html`, variante `Formulario compacto`. Las reglas funcionales existentes están en `docs/superpowers/specs/2026-10-09-flujo-heuristica.md`. Las precisiones siguientes adaptan la maqueta a los datos reales.

## Global Constraints

- Un único recuadro de configuración; desaparece la secuencia visual «Paso 1 de 4» a «Paso 4 de 4».
- Mostrar inicialmente nombre de evaluación, producto, objetivo, metodología, escala actual y resumen de expertos. Detalles de alcance, equipo, biblioteca, edición de criterios, escala personalizada y vista previa empiezan plegados.
- La maqueta simplifica el equipo a una cantidad: la implementación debe conservar la selección de personas por identidad, entre 1 y 5 expertos, y los lectores. No sustituirla por un selector de cantidad.
- La biblioteca completa sigue disponible: originales protegidos, métodos propios, combinación de criterios de distintas metodologías, autoría y fuentes.
- Preservar escalas mixtas y personalizadas. Una evaluación existente no se normaliza automáticamente a Nielsen ni a otra escala predefinida.
- Guardar un borrador e iniciar una evaluación siguen siendo acciones distintas. Conservar autoguardado, revisión, recuperación local, bloqueo durante escrituras y confirmación al salir.
- Reutilizar `Field`, `EscalaRapida`, `CriteriosMarcables`, `BarraSeleccion`, `PegarLista`, `VistaPreviaEvaluador` y los estilos/tokens del producto. Sin dependencias nuevas.
- El cambio cubre los cuatro bloques de configuración, tanto en creación como en borradores. El complemento de la tarea 4 presenta la aplicabilidad como campo separado en la valoración, sin cambiar las reglas de trabajo individual, consenso ni informe. La propuesta visual de evaluar un criterio a la vez todavía no forma parte de la implementación de este plan.
- Sin cambios de backend, migraciones, datos demo, permisos ni despliegue. No trasladar al producto las respuestas simuladas de la maqueta.

## Diseño concreto

1. **Campos principales:** rejilla de dos columnas en escritorio y una en móvil; metodología y escala se eligen sin recorrer todas las tarjetas de biblioteca.
2. **Metodología:** selector para explorar una base y botón explícito para usar su copia; navegar por el selector no reemplaza el trabajo actual. Mostrar aparte el nombre del método aplicado. «Biblioteca y combinación de criterios» despliega las tarjetas existentes y conserva sus acciones Usar, Editar y Borrar.
3. **Detalles plegados:** «Alcance y equipo», «Biblioteca y combinación de criterios», «Editar criterios (N)», «Personalizar escala» y «Vista previa del evaluador». Cada sección conserva sus controles montados para que plegarla no borre texto, selecciones ni respuestas de prueba.
4. **Resumen y acciones:** mostrar nombre del método, cantidad real de criterios, escala y expertos seleccionados. El pie del mismo recuadro contiene estado de guardado, errores y las acciones existentes. No agregar un guardado paralelo.
5. **Altura:** el formulario cerrado debe caber, con sus acciones, en el área de trabajo de escritorio a 1440 × 900. En móvil y al abrir detalles se admite desplazamiento natural; sin barras de desplazamiento anidadas, alturas rígidas ni texto reducido para forzar que todo quepa.

## Review Focus

- Un borrador con un método que ya no aparece en la biblioteca debe seguir mostrando y conservando su copia. Prueba en tarea 1.
- Plegar criterios, equipo o vista previa no debe perder cambios, selección entre bibliotecas ni texto todavía no agregado. Prueba en tarea 1.
- Escalas propias o diferentes por criterio deben conservarse hasta una acción explícita del usuario. Prueba en tarea 1.
- Fallo de red, cero criterios y guardado pendiente deben mantener mensajes visibles y las protecciones actuales. Prueba en tarea 2.
- Nombres largos, teclado, móvil de 390 px, ancho de 320 px y zoom de 200 % no deben ocultar campos ni acciones. Prueba en tarea 3.

## Archivos afectados

| Archivo | Responsabilidad del cambio |
| --- | --- |
| `apps/frontend/src/features/heuristica-flujo/ConfiguracionEditor.tsx` | Unificar la superficie, campos principales, desplegables y resumen. |
| `apps/frontend/src/features/heuristica-flujo/ConstructorMetodo.tsx` | Retirar `PasoCabecera` si queda sin consumidores y actualizar el mensaje «en el paso 2» por «en los criterios de esta evaluación». |
| `apps/frontend/src/features/heuristica-flujo/FlujoHeuristicaPage.tsx` | Integrar las acciones reales dentro del editor en `NuevaEvaluacion` y `ConfiguracionSesion`. |
| `apps/frontend/src/features/heuristica-flujo/TrabajoEditor.tsx` | Separar Aplicabilidad de Valoración en el editor compartido, conservando `noAplica`, `valor` y `motivo`. |
| `apps/frontend/src/features/heuristica-flujo/ChecklistView.tsx` | Presentar la misma aplicabilidad separada en los criterios de tipo checklist. |
| `apps/frontend/src/styles/theme.css` | Estilos limitados a `.hf .hf-config`; quitar `.hf-paso` si deja de usarse. |
| `apps/frontend/src/features/heuristica-flujo/ConstructorMetodo.test.tsx` | Actualizar expectativas de estructura y probar los desplegables y selección de métodos. |
| `apps/frontend/src/features/heuristica-flujo/flujo.test.tsx` | Adaptar interacciones a detalles plegados y cubrir guardado, recuperación y equipo. |
| `tests/e2e/heuristica-configuracion.spec.ts` | Un recorrido nuevo de configuración real, ejecutado en los dos proyectos Playwright existentes. |

## Tarea 1: Convertir el editor en un formulario compacto

**Interfaces:** Conservar la firma y props actuales de `ConfiguracionEditor`. Agregar una región `section.panel.hf-config` con nombre accesible `Configuración de la evaluación`. El selector exploratorio solo cambia estado local de presentación; `copiarMetodologia` se aplica mediante el botón explícito. Mantener `value` y `onChange` como única fuente del borrador.

- [ ] Actualizar la prueba que exige cuatro encabezados numerados. Añadir `muestra una sola configuración con detalles inicialmente plegados`: una región accesible, ningún encabezado «Paso N de 4», campos principales visibles y los cinco desplegables cerrados.
- [ ] Añadir `explorar una metodología no reemplaza la copia actual`: cambiar el selector no altera `latest.metodologia`; pulsar Usar copia carga la metodología elegida sin modificar el original. Un método propio ausente de `biblioteca` sigue representado como método aplicado.
- [ ] Añadir `plegar conserva el borrador del editor`: escribir en Pegar lista sin agregarla, marcar criterios de dos originales y editar un criterio; plegar/abrir conserva cada valor y selección. Abrir la vista previa, valorar un ítem y plegarla tampoco cambia `value` ni pierde esa respuesta local.
- [ ] Adaptar las pruebas de escalas, métodos propios y máximo de cinco expertos para que abran sus secciones antes de interactuar. Conservar sus aserciones funcionales, incluida una escala propia que no está en las opciones predefinidas.
- [ ] Ejecutar primero las pruebas nuevas y comprobar que fallan por la estructura actual:

  ```powershell
  pnpm --filter frontend test src/features/heuristica-flujo/ConstructorMetodo.test.tsx src/features/heuristica-flujo/flujo.test.tsx --maxWorkers=2
  ```

- [ ] Reorganizar el JSX existente; usar `<details>/<summary>` nativos. Mantener montados los editores al plegar, preservar handlers y validaciones, y dejar las herramientas extensas dentro de sus desplegables. No extraer un nuevo sistema genérico de formularios.
- [ ] Actualizar el mensaje de carga de criterios y retirar `PasoCabecera` y su CSS únicamente después de confirmar con `rg -n 'PasoCabecera|hf-paso|en el paso 2' apps/frontend/src` que no quedan usos necesarios.
- [ ] Repetir el comando anterior. Resultado esperado: ambas suites pasan y siguen cubriendo la biblioteca completa, no solo los dos métodos de ejemplo de la maqueta.

## Tarea 2: Integrar las acciones sin cambiar el guardado

**Interfaces:** Añadir `actions?: ReactNode` a las props de `ConfiguracionEditor`, importando el tipo desde React. Renderizarlo una vez al final de la región. `NuevaEvaluacion` y `ConfiguracionSesion` pasan su bloque actual `.hf-barra`, incluyendo estado y errores, sin cambiar callbacks, payloads ni revisiones.

- [ ] Añadir `muestra el guardado y sus errores dentro del recuadro`: con el API mock rechazando la creación, la región contiene el botón Guardar borrador y el error. El borrador conserva sus campos y la prueba existente de recuperación local sigue pasando.
- [ ] Añadir `mantiene las protecciones al iniciar`: en un borrador existente, un guardado fallido no envía `/iniciar`; una escritura pendiente mantiene deshabilitada la acción; un guardado correcto usa la revisión devuelta. Mantener la prueba de cero criterios y su explicación visible.
- [ ] Ejecutar `pnpm --filter frontend test src/features/heuristica-flujo/flujo.test.tsx --maxWorkers=2` y observar el fallo de las nuevas expectativas antes de mover las acciones.
- [ ] Pasar las acciones reales mediante `actions`; eliminar las barras externas duplicadas y los títulos redundantes. Mantener la protección `fieldset disabled={busy}` y el estado de guardado de cada contenedor.
- [ ] Repetir la suite. Resultado esperado: un único conjunto de acciones dentro de la configuración y las mismas operaciones de API y recuperación que antes.

## Tarea 3: Verificar sencillez, tamaño y accesibilidad en la aplicación real

**Interfaces:** CSS acotado a `.hf .hf-config`, con los tokens existentes. La nueva prueba E2E reutiliza `loginAsProfessor`, `PROJECT_ID`, `expectNoPageOverflow` y `expectInsideViewport` de `tests/e2e/helpers.ts`, en `/proyectos/${PROJECT_ID}/evaluacion-heuristica`.

- [ ] Añadir el recorrido: entrar, pulsar Nueva evaluación completa, completar nombre/producto/objetivo, aplicar una metodología, elegir escala, seleccionar una persona experta, editar un criterio y plegar/abrir. Verificar que los valores permanecen y guardar el borrador; volver a abrirlo y confirmar su configuración. No iniciar ni finalizar evaluaciones en esta prueba de configuración.
- [ ] Antes de completar los estilos, comprobar en el navegador las expectativas de espacio: a 1440 × 900 el formulario cerrado y su botón de guardado quedan visibles después de entrar a la configuración; a 390 px no hay desbordamiento horizontal y todas las acciones son alcanzables.
- [ ] Ajustar la rejilla a dos columnas donde quepa y a una en móvil. Usar espaciado, agrupación y secciones plegadas para reducir altura; no ocultar validaciones ni funciones para pasar la prueba visual.
- [ ] Revisar también a 320 px, con nombres largos, zoom de 200 %, tema claro/oscuro y solo teclado. Abrir/cerrar con teclado mantiene el foco y los controles táctiles conservan un tamaño utilizable. Capturar evidencia de escritorio y móvil.
- [ ] Ejecutar la validación final, en este orden:

  ```powershell
  pnpm --filter frontend test --maxWorkers=2
  pnpm --filter frontend build
  pnpm test:e2e -- tests/e2e/heuristica-configuracion.spec.ts
  git diff --check
  ```

  Resultado esperado: pruebas y compilación correctas; recorrido nuevo aprobado en escritorio y móvil; sin errores de whitespace. Registrar los totales reales, sin asumir que serán iguales a los de la versión anterior.

- [ ] Usar exclusivamente `observatorio_ux_e2e` o una base terminada en `_e2e`/`_test` para Playwright. No ejecutar semillas sobre la base del usuario. Si se mantienen los servidores Docker, evitar otra compilación Nest simultánea sobre `apps/backend/dist`; preparar un servidor de pruebas compilado y reutilizarlo si es necesario, como se verificó en esta sesión.
- [ ] Comparar el resultado con la variante «Formulario compacto». Confirmar que la biblioteca grande, la escala personalizada y la selección real de miembros siguen disponibles, aunque sus detalles ocupen más espacio al abrirse.

## Tarea 4: Mostrar «Sí aplica / No aplica» como campo independiente

**Solicitud adicional:** junto a la valoración debe existir un campo explícito de aplicabilidad por criterio. No es una nueva escala «Sí / No» ni una marca global que elimine el criterio para todos los expertos.

**Estado actual verificado:** `RespuestaCriterio` ya contiene `noAplica: boolean`, `valor: string | null` y `motivo: string`. `ValoracionEditor` incluye No aplica dentro del selector de valoración y `ChecklistView` lo muestra como N.A. Las reglas ya distinguen no aplica de sin evaluar y excluyen los no aplicables de los cálculos valorables. Esta tarea modifica su presentación y conserva esas reglas.

**Interfaces:** mantener las firmas existentes de `ValoracionEditor` y `ChecklistView`, sus props `respuesta`/`respuestas` y `onChange`. El primero se reutiliza en trabajo individual, consenso y vista previa; verificar todos esos consumidores sin cambiar sus contratos.

- [ ] Añadir pruebas en `flujo.test.tsx`: Aplicabilidad ofrece «Sí aplica» y «No aplica»; Sí aplica deja disponible la escala configurada, incluido un criterio con escala propia; No aplica oculta la valoración, guarda `valor: null` y exige motivo para contar como respondido y permitir la entrega.
- [ ] Probar el regreso a Sí aplica: `noAplica` vuelve a `false` y la valoración queda pendiente, sin recuperar silenciosamente un puntaje anterior. Conservar notas, hallazgos y el motivo escrito, sin contabilizar este último mientras el criterio aplica.
- [ ] Cubrir ambos editores, la recuperación de una respuesta antigua con `noAplica: true` y la vista previa. Mantener las pruebas existentes de consenso, bloqueo de entrega sin motivo y métricas de no aplica; sus resultados no deben cambiar.
- [ ] Ejecutar `pnpm --filter frontend test src/features/heuristica-flujo/flujo.test.tsx src/features/heuristica-flujo/ConstructorMetodo.test.tsx --maxWorkers=2` y comprobar que las expectativas del campo separado fallan antes de cambiar la presentación.
- [ ] Agregar el selector nativo etiquetado «Aplicabilidad» en ambos editores. Derivarlo de `noAplica`, sin crear otro estado de negocio. Mostrar el motivo cuando sea No aplica y la escala cuando sea Sí aplica. Retirar la opción NA y el radio N.A. de los controles de valoración para no duplicar la elección.
- [ ] Repetir las pruebas anteriores, el conjunto completo del frontend y `pnpm --filter frontend build`. En navegador, verificar con teclado y a 390 px que el campo funciona en trabajo individual y consenso, y que la vista previa no persiste respuestas reales.

## Entrega y reversión

- [ ] Revisar el diff para confirmar el alcance del cuadro anterior y ejecutar `git status --short`. Conservar `output/` y otros archivos ajenos a esta tarea.
- [ ] Entregar el cambio local con capturas, comandos y resultados; no publicar ni integrar cambios como parte de este plan. Un commit de implementación, si se realiza, debe incluir solo los archivos de esta mejora.
- [ ] La reversión consiste en restaurar esta modificación de interfaz. No hay migraciones ni transformación de borradores que deshacer.

**Criterio de terminado:** el usuario puede tomar las decisiones principales dentro de un solo recuadro y acceder a las opciones avanzadas sin recorrer cuatro secciones extensas; crear y retomar un borrador conserva todas las capacidades actuales.

**Estado del documento:** referencia de la primera propuesta. La corrección solicitada después por el usuario se describe en la actualización siguiente.


## Corrección solicitada: una técnica sencilla para quien empieza

El usuario rechazó agrupar todas las herramientas en un formulario. La implementación local ahora organiza las decisiones y utiliza el mismo editor de creación en el prototipo y en la técnica real.

- Creación: cuatro tareas desplegables, solo una abierta. Los campos requeridos para iniciar están visibles en las tareas correspondientes; biblioteca, combinación de métodos, edición y escalas avanzadas siguen disponibles al desplegar opciones.
- Borrador guardado: resumen breve y acción de iniciar; editar datos o equipo es opcional.
- Trabajo individual y acuerdo del equipo: una pregunta visible a la vez, avance y navegación. Aplicabilidad separada de valoración, con motivo obligatorio para no aplica. Cambiar de pregunta conserva los editores y las cargas de evidencia montados.
- Acuerdo: respuestas, problemas y preparación del informe separados. Conserva originales, aprobaciones, control de revisiones y guardado.
- Informe: resultado primero; contexto, fuentes, distribuciones, detalles y comparación se despliegan. No cambian cálculos ni PDF.
- Accesos y sesiones anteriores: lenguaje más directo, conservando los datos existentes.

Comprobación reproducible: `pnpm --filter frontend test --maxWorkers=2`, `pnpm --filter frontend build`, `node output/check-prototipo-heuristica.cjs` y `pnpm exec playwright test tests/e2e/heuristica-sencilla.spec.ts` (base separada de pruebas).

El prototipo `/prototipo/heuristica` sigue siendo una demostración local sin escrituras en proyectos. Las modificaciones de las pantallas reales permanecen solo en esta carpeta; no se publicaron.

Validación completada: 475 pruebas del frontend, compilación y revisión de diferencias sin errores; recorrido real de creación a informe aprobado en escritorio y móvil (2 pruebas E2E). La comprobación del prototipo también pasó sin escrituras en API. Los procesos temporales de pruebas se cerraron; la aplicación habitual sigue en el puerto 5173.

Validación del 17 de octubre: 468 pruebas del frontend y 46 de heurística del backend aprobadas; compilaciones de frontend/backend correctas. Navegador del prototipo aprobado a 320, 390 y 1440 px, sin escrituras en API. La prueba E2E con base de datos sigue pendiente por el fallo de Docker descrito arriba.
