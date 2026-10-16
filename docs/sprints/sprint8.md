# Sprint 8: Pruebas funcionales automatizadas + Pruebas de carga

Se implementó y consolidó la suite de automatización de pruebas para asegurar la estabilidad, resistencia a cargas concurrentes y adaptabilidad de la plataforma. El enfoque abarca pruebas unitarias e integración en backend/frontend, automatización E2E con Playwright y pruebas de carga con k6.

## Cobertura de Pruebas Automatizadas

La suite de pruebas automatizadas está dividida en cuatro niveles de verificación:

| Tipo de Prueba | Herramienta | Ámbito / Módulos Evaluados | Cobertura / Resultado |
| --- | --- | --- | --- |
| **Pruebas Unitarias UI** | Vitest | Vistas, componentes, hooks y utilidades de Card Sorting, Evaluación Heurística, Journey Map, Personas, Momentos Críticos, Admin y Permisos. | **449 tests en verde** (63 archivos)[cite: 1] |
| **Pruebas Unitarias API** | Jest (ESM) | Servicios core (`Auth`, `Users`, `Salas`, `Projects`, `Equipos`), motores de sesiones (`CardSorting`, `EvaluacionHeuristica`, `HeuristicaFlujo`) y adaptadores Prisma. | **326 tests en verde** (26 archivos)[cite: 1] |
| **Pruebas End-to-End** | Playwright | Flujos críticos de navegación, autenticación docente/estudiante, aislamiento de sesiones evaluador/participante, restricciones ADMIN y layout responsive. | **6 tests E2E en verde** (`desktop-chromium` y `mobile-chromium`)[cite: 1] |
| **Pruebas de Carga** | k6 | Evaluación de concurrencia en la API pública de participantes de Card Sorting (`access -> consent -> join -> results`). | Script validado en `tests/load/participante.k6.js`[cite: 1] |

## Pruebas Functional E2E (Playwright)

Ubicadas en la carpeta `tests/e2e/`, utilizan un servidor aislado backend/frontend con una base de datos PostgreSQL dedicada finalizada en `_e2e` (`observatorio_ux_e2e`)[cite: 1].

### Escenarios Coberturados (`main-flow.spec.ts` y `responsive.spec.ts`)
1. **Separación Evaluador / Participante:** Verifica que el cliente del participante no arrastre credenciales del evaluador y que la clasificación no contamine sesiones ajenas[cite: 1].
2. **Navegación Transversal:** Recorrido por login, selector de contexto, detalle de proyecto y acceso a las 5 técnicas UX[cite: 1].
3. **Control de Acceso (RBAC):** Restricción de analíticas avanzadas a estudiantes y bloqueo de la panel de administración (`/admin`) a usuarios sin rol `ADMIN`[cite: 1].
4. **Persistencia API Real:** Creación, lectura y edición con control de concurrencia y refresco de revisión en *Momentos Críticos*[cite: 1].
5. **Ajuste Responsive:** Validación de la UI ante viewports móviles (`390x844`) y escritorio (`1440x900`)[cite: 1].

## Pruebas de Carga (k6)

El script `tests/load/participante.k6.js` simula usuarios concurrentes ingresando a un estudio de Card Sorting mediante enlace o QR[cite: 1].

- **Aislamiento por IP / Rate Limit:** Mide el comportamiento ante las políticas de `limit_req` de Nginx y el *throttle* de la API (60 req/min por IP)[cite: 1].
- **Métricas Clave:** Rastrea duraciones de endpoints de acceso, consentimiento, registro de sesión y visualización de resultados[cite: 1].

## Comandos de Ejecución

- **Pruebas Frontend:** `pnpm --filter frontend test`[cite: 1]
- **Pruebas Backend:** `pnpm --filter backend test`[cite: 1]
- **Pruebas E2E (Playwright):** `npx playwright test --project=desktop-chromium`[cite: 1]
- **Pruebas de Carga (k6):** requiere k6 instalado y un entorno de pruebas con un proyecto y un estudio maestro de Card Sorting existentes y abiertos. `PROYECTO_ID` y `ESTUDIO_ID` son los UUID reales de esos registros; el script no los crea. `BASE_URL` apunta al origen que sirve `/api`.

  ```sh
  k6 run -e BASE_URL=http://localhost:8080 -e PROYECTO_ID=<uuid-proyecto> -e ESTUDIO_ID=<uuid-estudio> tests/load/participante.k6.js
  ```

  Reemplazar ambos marcadores antes de ejecutar. El flujo crea participantes, consentimientos y resultados; usar datos de prueba. Sin los dos identificadores, el script aborta antes de enviar peticiones. El límite por IP puede producir respuestas 429 y hacer fallar los umbrales de carga.
