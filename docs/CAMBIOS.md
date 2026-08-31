# Cambios aplicados — kit v2 (sobre archivos reales)

Todo acá parte de TUS archivos reales que subiste, con ediciones mínimas
y quirúrgicas. No hay archivos inventados desde cero salvo los dos nuevos.

## Nuevos (no existían)

- `apps/backend/src/common/filters/global-exception.filter.ts`
  Formato plano acordado: `{ statusCode, timestamp, path, message, errorCode }`.
  Mapea `PrismaClientKnownRequestError` (P2025→404, P2002→409) además
  de `HttpException` estándar y `ValidationPipe`.

- `apps/frontend/src/shared/api/toast.ts`
  No existía — `api-client.ts` ya lo importaba (`from './toast'`) sin
  que el archivo estuviera en el dump. Implementado con `notify.error/
  success/info` vía `CustomEvent('app:toast')` en `window`. Si ya tienes
  una librería de toasts en otra parte del proyecto, reemplaza el cuerpo
  de `emit()` — la firma pública no cambia.

## Editados (diff quirúrgico, resto del archivo intacto)

- `apps/backend/src/main.ts`
  2 líneas: import + `app.useGlobalFilters(new GlobalExceptionFilter())`.
  Tu `ConfigService`, `helmet`, `ValidationPipe`, `SwaggerModule` — todo
  igual, sin tocar.

- `apps/frontend/src/shared/api/api-client.ts`
  - `ApiValidationError.detalles` cambió de `{campo,mensaje}[]` a `string[]`
    (ver ⚠️ abajo).
  - Parseo de 400 y de errores generales ahora lee `body.message` plano
    en vez de `body.error.message`.
  - Se quitó `json.data` al final — el backend NO envuelve en `{data,meta}`
    (confirmado con el POST real que probamos: la respuesta vino directa).
  - Tu lógica de reconexión silenciosa en 401 (`obtenerTokenFresco`,
    el reintento único con `esReintento`) — **intacta, no se tocó nada ahí**.

- `apps/frontend/src/shared/api/artifacts.api.ts`
  - `ArtifactsApiError.detalles` cambió de `{campo,mensaje}[]` a `string[]`.
  - Parseo de error: `body.error.message` → `body.message`.
  - Se quitó `json.data` al final, mismo motivo que arriba.

## ⚠️ Revisar antes de dar por cerrado

1. **Pérdida de granularidad por campo.** El formato viejo asumía
   `{campo: 'nombreCompleto', mensaje: '...'}` — permite resaltar UN
   input específico en un formulario. `ValidationPipe` de Nest por
   defecto solo da strings tipo `"nombreCompleto must be a string"`
   (sin aislar el campo en una propiedad separada). Si algún componente
   de UI usa `.detalles[i].campo` para marcar inputs, hay que:
   - o bien parsear el string con regex (frágil), o
   - o bien agregar una `exceptionFactory` custom en el `ValidationPipe`
     de `main.ts` que sí devuelva `{campo, mensaje}[]` estructurado.
   No lo hice porque no vi ningún formulario real en los archivos que
   me pasaste — decisión pendiente tuya según si ya tienes ese UI o no.

2. **`{data, meta}` no confirmado en ningún lado.** Ese wrapper aparecía
   mencionado en comentarios de `api-client.ts` y `artifacts.api.ts`,
   pero no until vi ningún `ResponseInterceptor` real, y la prueba
   `curl` que hicimos juntos devolvió el objeto plano. Si en algún
   otro archivo que no me pasaste SÍ existe ese interceptor y de verdad
   envuelve las respuestas, esta edición lo rompe — grep rápido:
   ```bash
   grep -rn "ResponseInterceptor\|ClassSerializerInterceptor" apps/backend/src
   ```
   Si aparece algo, avísame y ajusto.

3. **`toast.ts` es un esqueleto sin UI.** Emite el evento, pero no hay
   ningún `<ToastContainer />` que lo escuche y pinte algo en pantalla
   todavía — si quieres, lo armo como siguiente paso.
