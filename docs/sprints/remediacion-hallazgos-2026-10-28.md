# Remediación de hallazgos del equipo (H1–H30) · 2026-10-28

No es un sprint numerado: ronda de correcciones sobre 30 hallazgos que el equipo reportó al probar el Observatorio UX
(H1–H30). Resultado buscado: el acuerdo de equipo de la heurística funciona sin errores 400/409 opacos y con un único
redactor elegido por el equipo. Fuente de verdad del avance: `PLAN_APROBADO.md` y un `FASE_<id>.md` por fase (plan de
trabajo, fuera del repositorio).

**Fuera de alcance:** H2 (eliminado, ver D6), consultas C1 (Persona: 1 imagen o varias fotos) y C2 (si Objetivo, Tareas
y Pantallas de la configuración son obligatorios), que son consultas al profesor y no código.

## Alcance implementado

| Fase | Hallazgo | Qué cambia |
|---|---|---|
| F1a, F1b | H6, H30, H8 | Mensaje 409 único con recarga visible y borrador conservado; comparación legible en vez de JSON. |
| F2a–F2d, F3a–F3c | H1, H22, H24, H25, H26 | Redactor único elegido por votación; solo él edita el acuerdo (403 en el servidor). "Estoy de acuerdo" y "Pido cambios". Entregar el acuerdo incompleto responde la lista de pendientes por sección, no un 400 opaco. |
| F4a | H3 | Crear un estudio de Card Sorting sin pasar por la pregunta (no es obligatoria). |
| F4b, F4c | H4 | Miembros del proyecto acceden a la analítica, `cerrarEstudio` y `getSession` de Card Sorting. |
| F4d | H5 | Cerrada sin cambios: `findAll`/`findOne` ya daban lectura a creador, miembro, docente de la sala y admin (D10). Por confirmar en producción. |
| F5a | H7 | Los equipos creados por el profesor se vinculan automáticamente al proyecto. |
| F5b, F5c, F5d | H27, H28, H29 | Informe legible ("qué se revisó y quién participó"), lista de Journey Maps legible, numeración única de pasos. |
| F6a | H10 | Nota fija en las 5 técnicas: "Si otra persona del equipo cambia algo, actualiza la página para ver los datos nuevos". |
| F6b | H9 (parcial) | "Última edición por {nombre} · {fecha de Chile} · Versión N" en Personas y Momentos críticos, derivado de las versiones de `UxArtifact`. Sin migración (D13). |
| F7a | H11, H12 | Guardar problema con aviso, tarjeta colapsada y "Editar problema N". |
| F7b, F7c, F7d, F7f | H13–H16 | Botón "Listo", "Siguiente sección" separado de "Entregar", mensaje claro al entregar, aviso de terminada y vuelta al inicio. |
| F7e | H17 | La revisión pendiente dice qué usuario la creó. |
| F8a | H18 | Marca de coincidencias entre evaluadores: personas distintas con problemas en la misma pregunta (D12). |
| F8b, F8c, F8d | H19–H21, H23 | Categorías plegables y estados en el acuerdo, aspectos positivos con la mecánica de problemas, recarga y posición al entregar o confirmar. |
| F9 | — (D9) | `ProjectsService.create` valida que un docente sea dueño de la sala antes de asociar el proyecto. |
| F10 | — | Marca de error y reintento del autoguardado de comentarios del acuerdo. |
| F11 | — | "Recargar revisión conservando mi borrador" solo aparece ante un conflicto 409, no tras un 400. |
| F12 | H9 (parcial) | El acuerdo muestra "Última edición por {nombre} · {fecha de Chile}" (`guardadoPor` y `guardadoEn` en el JSON `consenso`, sin migración). |

## Decisiones que quedan

- **D1** el redactor lo elige el equipo por voto y solo él escribe. **D2** con empate o voto faltante decide el coordinador. **D3** sin redactor elegido redacta el coordinador.
- **D5** las confirmaciones se reinician solo si cambia una decisión (valor o "no aplica" de un criterio, decisión o ids de un hallazgo), no por comentarios ni textos.
- **D6** H2 se elimina: el redactor guarda borradores incompletos y la completitud se exige solo al entregar, con la lista exacta por sección.
- **D7** fechas en hora de Chile y formato legible (`fechaChile`).
- **D8** el redactor y los votos viven en el JSON `consenso`, sin migración. F12 sigue esta decisión con `guardadoPor` y `guardadoEn`.
- **D12** coincidencia de problemas = personas distintas con problemas que comparten al menos una pregunta; no se compara el texto.
- **D13** el registro de ediciones (H9) se deriva de las versiones existentes de `UxArtifact` (`autorId`, `createdAt`, `version`), sin tabla de auditoría ni migración.

Contratos nuevos relevantes: `redactorDe` y `ganadorVotoRedactor` (shared-types), `pendientesAcuerdo`,
`ConsensoFlujo.guardadoPor/guardadoEn`, rutas `redactor/voto`, `redactor/decidir`, `pedir-cambios` y `entregar-acuerdo`.

## Verificación

- E2E desktop 13/13 en el equipo del usuario (con `pnpm build:shared` antes de `pnpm test:e2e:desktop`), con todo aplicado hasta F10.
- F6b: `artifacts.service` 38/38 y frontend 674/674; contra el código original fallan los tests nuevos (include del autor, Persona y Momentos críticos) y el de 403 pasa.
- F11: `flujo.test` 103/103 y build OK; con el `TrabajoEditor.tsx` original falla solo el test del 400 y el del 409 pasa.
- F12: backend `heuristica-flujo.service` 66/66, frontend `flujo.test` 104/104 y build OK. `tsc` del backend: los mismos 8 errores previos en `heuristica-flujo.schemas.spec.ts` y `heuristica-flujo.service.spec.ts`, ninguno nuevo.
- Revisión de secretos: sin coincidencias de claves AWS, claves privadas ni tokens de GitHub; un grep más amplio sobre una copia del repositorio solo mostró valores de ejemplo y de prueba.

**Sin verificar:**
- Prueba de F12 contra el código original.
- E2E con F11 y F12 aplicadas.
- Revisión visual de F7f (CSS en tamaño normal y móvil) y de F8b (categorías plegadas).

## Pendiente (fuera de esta entrega)

- **H9 en Heurística y Card Sorting:** Heurística queda cubierta solo para el acuerdo (F12); los trabajos individuales ya tienen `guardadoEn`. Card Sorting no se mapeó: falta definir qué es "última edición" en un estudio que no se versiona.
- **Sin definición del equipo:** "más claridad para resolver los hallazgos" y "ver qué hace el recuadro al agregar una imagen".
- **D10:** confirmar en producción (Vercel) si un proyecto en modo lectura sigue sin dejar leer ni verse al resto del equipo (H5).
- **C1 y C2:** consultas al profesor.
- Tras un 400 "Datos inválidos" el mensaje dice "Reintenta Guardar" pero no se verificó si el comportamiento es el esperado en todos los editores.
- `artifacts.api.ts` importa `fechaChile` desde `features/heuristica-flujo/flujo-utils`: acoplamiento de `shared` hacia una feature; mover `fechaChile` a `shared/utils` sería una fase aparte.
- Falta test de `ProjectsService.findOne` para el miembro (menor). Card Sorting y heurística no usan `puedeEditarArtefactos` (por verificar si H5 los incluía).
- El aviso al equipo por cambio de redactor es solo en pantalla, sin notificación externa.
