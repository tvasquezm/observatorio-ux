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
- Los comentarios conservan su forma: el campo `tecnica` (comentarios por
  técnica, ver `docs/BACKEND.md`) no se incluye en el JSON ni en el PDF. Los
  filtros `?tecnica=` aplican solo al endpoint `GET /api/projects/:proyectoId/comments`.
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

## Carga de capturas de evidencia (2026-10-15)

Las capturas de pantalla superaban el tope de 2 MB y no podían subirse. Se
comprimen en el navegador antes de enviarlas y el tope del servidor sube a 4 MB.
Los reportes PDF incrustan estas capturas, por eso se documenta aquí.

- `EVIDENCIA_MAX_BYTES` pasa de 2 MB a 4 MB y se agrega `EVIDENCIA_MAX_MB` en
  `packages/shared-types`. Los mensajes del backend y del frontend leen esa
  constante. Nginx (`client_max_body_size 5m`) queda por encima y no cambia.
- `apps/frontend/src/shared/utils/comprimir-imagen.ts` reduce las imágenes de
  más de 500 KB: lado mayor de 2560 px y 8 megapíxeles, WebP con calidad 0.85,
  0.70 y 0.55, y hasta 4 rondas reduciendo un 25% las dimensiones hasta bajar de
  3 MB. Si el navegador no codifica WebP usa JPEG. Ante cualquier fallo devuelve
  el original y la validación decide.
- Se aplica en los dos puntos de subida: `HallazgoForm.tsx` (evaluación
  individual) y `EvidenciaEditor.tsx` (flujo completo). La compresión ocurre
  antes de `validarArchivoEvidencia`. Las anotaciones del flujo completo son
  coordenadas normalizadas entre 0 y 1, por lo que no se desalinean al reducir.
- El servidor mantiene todas sus validaciones: tamaño, tipo real por magic
  bytes y máximo de 50 capturas por sesión.
- Las capturas siguen en las tablas `evidencias_heuristica` y
  `evidencias_heuristicas_completas` (`BYTEA`), separadas de los listados y
  leídas solo por identificador. No hay migración ni variables de entorno nuevas.
- `MAX_CAPTURAS_PDF` sigue en 30. Con capturas comprimidas el peso es mucho
  menor al máximo de 4 MB; el peor caso sin comprimir es de unos 120 MB en la
  memoria del navegador al generar el PDF.

Verificación en rama `feat/compresion-capturas-evidencia`:

```bash
pnpm build:shared
pnpm --filter backend test
pnpm --filter frontend test
pnpm --filter frontend build
```

Resultado: backend 326/326, frontend 456/456 y compilación sin errores de
tipos. Pendiente: probar a mano con una captura de más de 3 MB en ambos flujos y
confirmar en producción que el rewrite de Vercel hacia Render admite cuerpos de
hasta 4 MB.
