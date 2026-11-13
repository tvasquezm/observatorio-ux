# CIERRE FASE F4

Fecha: 2026-11-12

Hecho:
- Fuente única `shared/content/tecnicas-info.ts`: cinco descripciones (≤160 caracteres), cuatro secciones de explicación y ayudas de gráficos. **Textos nuevos pendientes de revisión humana.**
- El selector de proyecto ofrece explicación completa y descarga PDF por técnica; inicio reutiliza las descripciones.
- Ayuda visible «¿Cómo leer esto?» mediante InfoTip en vistas/matrices de card sorting, dendrograma, matriz heurística, cumplimiento, Journey Map y Momentos críticos.
- Gráficos con más ancho y menor relleno; pestañas de resultados conservan su ancho y dejan de superponerse a 375/Huge.
- «Exportar resultados (PDF)» abre selección de portada/resumen y vistas existentes, color/blanco y negro y separación. Incluye descripción por casilla, resumen reactivo, progreso, error y reintento.

Archivos tocados: contenido/ayuda/PDF de técnicas, selector e inicio, InfoTip y sus consumidores de gráficos, diálogo y generador PDF de card sorting, CSS acotado y tests.

Contratos reales:
- `exportarEstudioPdf(data, vistas, alcance, opciones?)`; alcance añade `seleccion` sin retirar `vista`/`todas`. Opciones: `resumen`, `color`, `separarSecciones`. Sin opciones se conserva el comportamiento previo.
- Las vistas disponibles son cards, categories, results, popular, similarity, dendrogram, participants y answers (solo si hay preguntas). El dendrograma exporta su tabla de uniones, como ya hacía el generador.
- La explicación usa 11 puntos y resultados 9.5 puntos de texto base, independientes del CSS de la app.
- Blanco y negro transforma los colores de contenido/cabeceras; utiliza la identidad tipográfica existente para evitar logos rasterizados en color.
- Un cambio de orientación puede requerir página nueva aun con separación desactivada.

Desvíos: no existía el modal de resultados descrito por el plan. Se añadió usando el diálogo nativo y estilos del exportador general existente; este último mantiene su propia interfaz. Guía y PDF de explicación comparten implementación/contenido y se agrupan como un tema.

Verificación:
```text
Regresión de opciones y componentes nuevos: fallan antes de implementar.
Descarga real descubre que pdfmake normaliza las listas recibidas y mutaba el contenido de pantalla.
Prueba de propiedad del contenido: roja con referencia compartida; verde al copiar la lista de pasos.
pnpm --filter frontend test: 80 archivos, 755 pruebas aprobadas
pnpm --filter frontend build: built in 644ms; exit 0
Chromium: cinco explicaciones descargadas y tres combinaciones de resultados.
pdfinfo: las cinco explicaciones tienen una página A4 cada una.
Resultados Normal: 4 páginas; Huge: 4 páginas; blanco/negro sin portada ni separación: 1 página.
pdftoppm -png -r 80: 14 páginas renderizadas sin error.
Hash de las cuatro páginas PNG Normal/Huge: idénticos uno por uno.
Diálogo: Shift+Tab/Tab conservan foco dentro; Escape cierra.
375/Huge: sin desborde horizontal del documento; pestañas sin superposición.
```

Capturas / evidencia manual: `evidencias/F4` contiene los ocho PDF de muestra, capturas de pantalla y renderizados de portada, tabla, blanco/negro y explicación. API simulada. Se revisaron visualmente estos renderizados; no se atribuye a producción.

Pendientes: revisión humana de los textos nuevos. Los PDF generales y de otras técnicas mantienen sus exportadores porque no usan este modal. No se añadieron formatos, dependencias ni técnicas.
