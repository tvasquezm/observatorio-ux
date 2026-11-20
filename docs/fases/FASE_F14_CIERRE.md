# FASE F14: Dependencias de desarrollo

Estado: hecha. La autorización del usuario incluye el parche de `qs` en producción.

Archivos tocados: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `docs/RIESGOS_ACEPTADOS.md`, `CHANGELOG.md` y este cierre.

Línea base (`09fc4fe`): 5 avisos moderados, 1 bajo, 0 altos. La revisión del árbol de producción encontró también `qs` a través de Express y Body Parser. Se verificó ese alcance antes de actualizarlo, y el usuario autorizó la excepción. El aviso previo de `deepmerge` no apareció en la respuesta actual del registro.

| Paquete | Versión observada antes | Versión corregida | Ruta del aviso |
|---|---|---|---|
| `qs` | 6.16.0 | 6.17.1 | Superagent en pruebas y Express en producción |
| `fast-xml-parser` | 5.11.1 | 5.12.1 | commit-and-tag-version |
| `minimatch` | 9.0.9 y 10.2.6 | 11.0.9 | test-exclude y glob en la cadena de Jest |
| `glob` | 10.5.0 y 13.0.6 | 14.0.6 | test-exclude y @jest/reporters |

El override de `minimatch` se limitó al rango afectado para conservar la rama 3.1.5 fuera del aviso.

Comandos ejecutados y resultado

- `pnpm install` y las suites de backend y frontend después de cada cambio → los cuatro ajustes pasaron.
- `pnpm install --frozen-lockfile` → salida 0. Lockfile local SHA-256 `B215B5D3043E851B6D17AB28AEFD4313D902A98E8DF9385C0D2DAC094644F564`.
- `pnpm audit --audit-level high`, `pnpm audit --audit-level low` y `pnpm audit --prod --audit-level low` → salida 0 y sin avisos en los tres comandos.
- `pnpm --filter backend test --maxWorkers=4` → 27 suites y 396 pruebas pasan. `pnpm --filter frontend test` → 87 archivos y 822 pruebas pasan.
- `pnpm --filter backend build` y `pnpm --filter frontend build` → salida 0. El chequeo HTTP de sesiones también pasó con el árbol actualizado.

Pendientes: ninguno en el paquete local.
