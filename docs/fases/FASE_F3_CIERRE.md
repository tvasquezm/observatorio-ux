# CIERRE FASE F3

Fecha: 2026-11-12

Hecho:
- F3a: insignia determinista por sala (ocho tokens + inicial), enlace Miembros en cabecera y summary de Comentarios con icono/aspecto de botón, conservando carga diferida.
- F3b: OptionalTag reutilizado en proyecto, sala, Persona y Journey Map; inventario de validaciones en `F3_CAMPOS_OPCIONALES.md`. No se etiqueta como opcional ningún campo obligatorio de Momentos críticos. Heurística y preguntas de card sorting ya tenían las etiquetas correspondientes.
- Ingreso con «Una por una», «Agregar varias tarjetas/categorías/preguntas» y «Escribe una por línea.». Conserva contador, deduplicación y botón masivo con singular/plural.

Archivos tocados: insignia/lista/detalle de salas, ProjectDetailLayout, ComentariosTecnica, OptionalTag, formularios enumerados, CardSortingEntry, reglas puntuales de theme.css y tests.

Contratos reales: hash unsigned base 31 del id, módulo ocho; la misma sala conserva color entre lista/detalle y temas. Ningún cambio de datos ni endpoint. Comentarios sigue montando su panel solo al abrirlo, sin consultas para conteos.

Desvíos: división F3a/F3b por tamaño, según el plan. Se mantuvieron las etiquetas opcionales ya correctas; no se añadió el helper a componentes que ya tenían un patrón válido.

Verificación:
```text
Regresión de summary, Miembros, OptionalTag y etiquetas de ingreso: fallan antes y pasan después.
pnpm --filter frontend test SalaBadge ComentariosTecnica ProjectDetailLayout ProfesorSalasPage SalaDetalle: 24 pruebas aprobadas
pnpm --filter frontend test OptionalTag CardSortingEntry PersonasPage JourneyMapPage ProjectsPage ProfesorSalasPage CardSortingPage: 80 pruebas aprobadas
pnpm --filter frontend test: 75 archivos, 734 pruebas aprobadas
pnpm --filter frontend build: built in 794ms; exit 0
Paleta: texto blanco sobre los ocho colores entre 4.75:1 y 5.37:1.
Colores frente a superficie oscura #182033: entre 3.03:1 y 3.42:1.
Frente a superficie clara #fff: entre 4.75:1 y 5.37:1.
Los bordes usan --ink para conservar delimitación en alto contraste.
```

Capturas / evidencia manual: diez capturas en `evidencias/F3`: salas (ocho insignias), cabecera de proyecto, ingreso masivo en paso 2, Persona y Journey Map. 1280 px, escala Large, claro y oscuro, API simulada. La navegación entre pasos conserva las entradas y las etiquetas.

Pendientes: revisión con personas no técnicas; validación con lectores de pantalla y datos reales. La captura de página completa conserva la cabecera fija a la altura de desplazamiento que provoca el foco del formulario; no se modificó ese comportamiento previo.
