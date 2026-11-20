# FASE F21: Campos opcionales marcados

Estado: hecha.

Archivos tocados: `CardSortingEntry.tsx`, `CardSortingWorkspace.tsx`, `CardSortingPage.tsx`, `ConfiguracionEditor.tsx`, `campos.tsx`, sus pruebas, `CHANGELOG.md` y este cierre.

| Pantalla | Campos | Opcionales | Marcados |
|---|---|---|---|
| Nuevo Card Sorting | Nombre, tipo y tarjetas | No | No |
| Nuevo Card Sorting | Categorías predefinidas para cerrado e híbrido | No | No |
| Nuevo Card Sorting | Preguntas | Sí | Sí |
| Clasificación Card Sorting | Dentro de | Sí | Sí |
| Configuración heurística | Producto, metodología, escala y equipo de revisión | No | No |
| Configuración heurística | Nombre de la revisión, URL, objetivo, pantallas, versión, dispositivo, identificador, tareas y exclusiones | Sí | Sí |
| Personas | Nombre completo | No | No |
| Personas | Datos descriptivos, fotografía, listas, evidencia y validación | Sí | Sí |
| Journey Map | Perfil, rol y nombre de cada fase | No | No |
| Journey Map | Objetivo, evento inicial, evidencia y detalle de fase | Sí | Sí |
| Momentos críticos | Campos de texto y selectores del formulario | No | No |
| Salas | Nombre, período, inicio y término | No | No |
| Salas | Instrucciones o descripción | Sí | Sí |
| Proyecto | Nombre y sala | No | No |
| Proyecto | Descripción | Sí | Sí |

El identificador del producto puede quedar vacío porque se completa antes de enviar. «Dentro de (opcional)» conserva su texto y comportamiento con `OptionalTag`. «Agregar varias» ya estaba presente. La indicación sobre ubicaciones de tarjetas está en F2.

Comandos ejecutados y resultado

- `pnpm --filter frontend test` → 86 archivos y 818 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.

Pendientes: ninguno.
