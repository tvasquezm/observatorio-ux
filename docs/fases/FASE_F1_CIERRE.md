# CIERRE FASE F1

Fecha: 2026-11-12

Hecho:
- Texto del anillo de avance en rem proporcional al tamaño del anillo.
- Preferencias deja de recortar los controles de fuente a 150 % en móvil.
- Se conservan los cinco niveles y su aplicación temprana en main.tsx.

Archivos tocados: AnilloAvance.tsx, su test y dos reglas acotadas de theme.css.

Contratos reales: normal / large / xlarge / xxlarge / huge; localStorage `observatorio-ux-font-size`. El texto SVG de anotaciones conserva sus 25 unidades: escala dentro del viewBox 0–1000.

Desvíos del plan: base `Hallazgos-prueba-de-usabilidad` (5f0ce21), donde existen las prestaciones que el documento da por hechas. Se excluye el modo express de heurística por petición directa del usuario. No se modifican cambios locales de otros trabajos ni parte1/.

Verificación (salidas):
```text
Node v24.19.0; pnpm 10.34.5
pnpm install --offline --frozen-lockfile: 962 paquetes reutilizados; exit 0
pnpm --filter @observatorio-ux/shared-types build: exit 0
pnpm --filter backend exec prisma generate: Generated Prisma Client (7.10.0)
Línea base, antes de modificar producto:
pnpm --filter frontend test: 72 archivos, 719 pruebas aprobadas
pnpm --filter frontend build: built in 2.39s; exit 0
pnpm --filter backend test --runInBand: 25 suites, 374 pruebas aprobadas
Regresión del anillo: falla con px; pasa con rem.
pnpm --filter frontend test: 72 archivos, 720 pruebas aprobadas
Tras ajustar Preferencias:
pnpm --filter frontend test AnilloAvance AppLayout: 26 pruebas aprobadas
pnpm --filter frontend build: built in 659ms; exit 0
rg -n 'font-size:\s*[0-9.]+px' apps/frontend/src: sin coincidencias
```

Capturas / evidencia manual: Chromium headless, API simulada; 375 y 1280 px, xxlarge y huge, claro/oscuro/alto contraste. Proyectos, detalle, sala, ingreso, resultados, login, Preferencias y exportación general. Detalle de mediciones en `evidencias/F1/verificacion.json`. Capturas del caso 375/huge en esa carpeta. Preferencias permite reducir el tamaño en las 12 combinaciones, sin desborde interno. Login y PDF se repitieron esperando su contenido real; se sustituyó la captura inicial de login, que redirigía al inicio por tener sesión.

Pendientes:
- Resultados, 375/huge: las pestañas se superponen visualmente; F1 lo registra sin corregirlo, según su alcance.
- React advierte por `fetchpriority` en el login, previo al cambio.
- El navegador completo de esta máquina falla por configuración en paralelo; se usó el headless shell ya instalado.
- Los tests no usan datos productivos; no se hizo despliegue.
