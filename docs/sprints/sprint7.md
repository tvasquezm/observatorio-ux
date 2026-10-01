# Sprint 7: reportes PDF y exportación JSON

El backend permite exportar los datos guardados de un proyecto. La interfaz
mantiene su exportador por técnicas; ambos incluyen los nuevos campos de
Personas: relación y rol en el servicio, características distintivas, evidencia,
estado y observaciones de validación.

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/projects/:proyectoId/reports/json` | Objeto JSON del proyecto |
| GET | `/api/projects/:proyectoId/reports/pdf` | Archivo PDF adjunto |

Ambos requieren un UUID válido, autenticación de evaluador y rol ESTUDIANTE,
DOCENTE o ADMIN. `ProjectAccessService.assertAccess` comprueba el acceso al
proyecto antes de consultar sus datos. La autenticación acepta la cookie
`evaluadorToken` o un Bearer de evaluador; el token de participante no habilita
estos endpoints. Son consultas GET y no requieren un token CSRF.

El PDF responde con `Content-Type: application/pdf`, `Content-Length` y
`Content-Disposition: attachment; filename="reporte-proyecto-{proyectoId}.pdf"`.
Las rutas pertenecen a `ReportsController`, registrado mediante `ReportsModule`;
no se agregaron rutas a `ProjectsController`.

## Datos y permisos

El JSON contiene `generatedAt`, `proyecto`, `resumen`, `artefactos`, `sesiones`
y `comentarios`. El resumen cuenta únicamente los registros incluidos.

- Los artefactos conservan todas las versiones no eliminadas, con autor y fecha.
  El exportador de la interfaz utiliza las versiones vigentes.
- Los comentarios excluyen los eliminados mediante Soft Delete.
- Las sesiones heurísticas individuales se limitan al evaluador que exporta;
  ADMIN puede exportar todas las del proyecto.
- Card Sorting incluye los estudios propios y sus sesiones de participantes.
  DOCENTE también puede exportar Card Sorting de las salas que administra,
  siguiendo el permiso existente de lectura y analítica. No se exportan datos
  de identificación de participantes.
- Las tarjetas, categorías y agrupaciones se incluyen desde sus relaciones
  Prisma, porque las respuestas de Card Sorting no se guardan en `resultado`.
  `estudioId` permite asociar una respuesta con su estudio.

El PDF del backend presenta la información general, contenido de artefactos,
sesiones y comentarios. Es una exportación de datos guardados: no calcula nuevas
métricas agregadas. Usa las fuentes Roboto incluidas en
`pdfmake/build/vfs_fonts`, sin archivos externos ni descargas en ejecución.

## Comprobación

Desde la raíz del monorepo:

```bash
pnpm --filter @observatorio-ux/shared-types build
pnpm --filter backend test reports --runInBand
pnpm --filter frontend test src/features/reports/report-data.test.ts
```

Las pruebas verifican generación de un PDF real, rechazo de acceso, filtros por
rol, exclusión de proyectos eliminados, inclusión de Card Sorting y los nuevos
campos de Personas en el informe de la interfaz.

Para una prueba manual, usar un proyecto accesible y un token de evaluador:

```bash
curl --fail --show-error \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/projects/$PROYECTO_ID/reports/json"

curl --fail --show-error \
  -H "Authorization: Bearer $TOKEN" \
  -o reporte-prueba.pdf \
  "http://localhost:3000/api/projects/$PROYECTO_ID/reports/pdf"
```
