# Mejoras UX/UI

Se implementaron los diez puntos de la revisión del Observatorio UX, reutilizando
los componentes, el diálogo de confirmación y los temas existentes.

| Área | Comportamiento incorporado |
| --- | --- |
| Borradores | Cancelar o cambiar de editor pide «Seguir editando» o «Descartar cambios» cuando hay modificaciones. Se mantienen la protección de navegación y recarga y los bloqueos de edición existentes. |
| Errores de proyectos | Carga, error y lista vacía tienen estados distintos; el error permite reintentar y no presenta un contador falso de cero. |
| Proyecto activo | Inicio permite elegir el proyecto, conserva la selección por cuenta durante la sesión y recuerda los proyectos visitados. Con varios proyectos no elige arbitrariamente el primero. |
| Orientación | Breadcrumbs con enlaces, título de pestaña por sección y proyecto, y foco en el encabezado al navegar. |
| Legibilidad | Texto secundario más oscuro, descripciones de 14px y metadatos principales de al menos 12px; se conservan modo oscuro y alto contraste. |
| Inicio móvil | Preferencias bajo demanda, barra compacta y elección de proyecto y técnicas antes de las métricas. |
| Resumen | Técnicas en tres, dos o una columna según el ancho; identificador técnico dentro de «Información para soporte». |
| Navegación del proyecto | Enlaces agrupados visibles en escritorio, desplegable nativo en móvil con cierre al navegar y mediante Escape. Nombres consistentes con Inicio y las técnicas. |
| Controles | Botones de al menos 44px, incluidos editar, eliminar y confirmaciones; guías de Card Sorting con área de activación ampliada y foco visible. |
| Formularios | Etiquetas persistentes, errores asociados al nombre del proyecto y explicación previa cuando un estudiante no puede crear proyectos en sus salas. |

## Verificación

```sh
pnpm install --frozen-lockfile
pnpm build:shared
pnpm --filter frontend test
pnpm --filter frontend build
```

- 236 pruebas del frontend aprobadas; compilación TypeScript/Vite correcta.
- Revisión visual de nueve rutas a 1440, 390 y 320px: 27 vistas sin
  desbordamiento horizontal, con título y foco en encabezado.
- Navegador real: conservación y descarte de borradores, retorno de foco,
  navegación de proyecto, Escape, preferencias dentro del viewport, persistencia
  del proyecto y recuperación tras una respuesta 503 simulada.
- Contraste de descripciones de técnicas y métricas comprobado sobre fondos
  sólidos y extremos de gradientes: mínimo 4,55:1 en los cuatro modos.
- Las 12 pruebas E2E de escritorio y móvil aprobaron con una base aislada.
  Contemplan los nombres y la navegación actualizados. Para ejecutarlas, usar una base terminada en
  `_e2e` o `_test`, según `playwright.config.ts`, y `pnpm test:e2e`.

La revisión no equivale a una certificación WCAG ni reemplaza pruebas con
lectores de pantalla y personas usuarias. No se agregaron dependencias.
