# FASE F8: Inicio en dos pasos

Estado: hecha
Archivos tocados: `apps/frontend/src/pages/DashboardPage.tsx`, `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx`, `apps/frontend/src/styles/theme.css`, `CHANGELOG.md`.

Comandos ejecutados y resultado:
- `pnpm --filter frontend exec vitest run src/pages/__tests__/DashboardPage.test.tsx` -> 1 archivo, 6 pruebas en verde.
- `pnpm --filter frontend test` -> 82 archivos, 792 pruebas en verde.
- `pnpm --filter frontend build` -> verde (`built in 748ms`).
- `grep -rn "metrics|recent-grid|welcome-actions|methods-title"` -> en JSX ya no aparecen; en CSS se retiraron las reglas de Inicio.

Hecho:
- Encabezado: el kicker queda solo con la fecha; se quitan el conteo de proyectos, el párrafo bajo el `h1` y el bloque `welcome-actions` con "Ver proyectos". Se conserva el `h1` y la ilustración `welcome-visual`.
- Se quita la sección "Cómo se organiza el trabajo" (panel Sala → Proyecto → Técnica).
- Paso 1: `section.active-project` con `h2` "1 · Proyecto" (número en `span.step-num` con `aria-hidden`). Se conserva el selector `#active-project` con etiqueta "Proyecto activo", el error con "Reintentar", la carga y el estado sin proyectos. Se quitan "Trabajando en: …" y "Continuar en …". Sin proyecto elegido solo queda la ayuda "Selecciona un proyecto para abrir sus técnicas.". Se agrega el enlace "Todos los proyectos" a `/proyectos` (clase `ghost`) junto al selector.
- Paso 2: `h2` "2 · Técnica" en lugar del `section-title` con "MÉTODOS DISPONIBLES"; `section.techniques` y las cinco tarjetas quedan igual (mismos enlaces, `descripcionCorta`, "Abrir técnica →" / "Elegir proyecto →").
- El bloque "Salas en las que estás inscrito" (solo si el rol es ESTUDIANTE) se mueve debajo de las técnicas, sin cambiar su contenido.
- Se eliminan las métricas, "Proyectos creados recientemente" y el artículo "Cada técnica alimenta la misma decisión"; también `DOT_COLORS`, `recientes`, `totalSesiones`, `activeRole`, `PERSPECTIVE_LABELS`, `resolvePerspective` y sus importaciones.
- La lógica del proyecto activo (`selectedId`, `activo`, `chooseProject` y la clave `observatorio-ux-project:<userId>`) no cambia; las pruebas lo comprueban.
- CSS: se retiran `.metrics`, `.dashboard-page .metrics`, `.metric` (reglas propias), `.welcome-actions` (incluida su regla móvil), `.recent-grid` (incluida su parte del media query) y sus apariciones en los media queries de 900, 760 y 360 px. `.decision`, `.panel-head`, `.project-row`, `.welcome-visual`, `.active-project` y `.techniques` no se tocan. Se agregan `.step-title`, `.step-num` y `.step-project-row` con variables del tema y `rem`.
- `CHANGELOG.md`: línea nueva del Inicio en dos pasos.

Cambios respecto al plan (desvíos): ninguno funcional. No se creó una lista de "últimos 3 proyectos" porque no hay dato del usuario sobre docentes con más de ~10 proyectos: queda como pendiente de dato, según la fase.

Pendientes y dudas:
- A 1366 × 768 las cinco tarjetas aparecen en una fila con el proyecto seleccionado. El borde inferior de cada una queda fuera del área visible inicial. [Captura](FASE_F8_capturas/inicio-1366.png)
- Quedan referencias a `.metric` dentro de selectores agrupados del tema oscuro y de alto contraste (reglas compartidas con `.panel`, `.tech-card`, etc.). No tienen efecto porque ningún elemento usa esa clase; se dejan para la higiene de tokens de F15.
