# FASE F1: Quitar explicación completa y PDF

Estado: hecha
Archivos tocados: `apps/frontend/src/pages/ProjectOverviewPage.tsx`, `apps/frontend/src/pages/__tests__/ProjectOverviewPage.test.tsx`, `apps/frontend/src/shared/components/TechniqueHelp.tsx` (borrado), `apps/frontend/src/shared/components/TechniqueHelp.test.tsx` (borrado), `apps/frontend/src/shared/utils/tecnica-pdf.ts` (borrado), `apps/frontend/src/shared/utils/tecnica-pdf.test.ts` (borrado), `apps/frontend/src/shared/content/tecnicas-info.ts`, `apps/frontend/src/shared/content/tecnicas-info.test.ts`, `apps/frontend/src/styles/theme.css`, `CHANGELOG.md`.

Comandos ejecutados y resultado:
- `grep -rn "TechniqueHelp|tecnica-pdf|explicacionCompleta"` (antes): solo `ProjectOverviewPage`, los dos componentes con sus pruebas y `tecnicas-info`; confirmado que nada más los importaba.
- `pnpm --filter frontend exec vitest run src/pages/__tests__/ProjectOverviewPage.test.tsx src/shared/content` -> 2 archivos, 3 pruebas en verde.
- `pnpm --filter frontend test` -> 81 archivos, 771 pruebas en verde (antes 83/781: se retiran 2 archivos y 10 pruebas de lo eliminado).
- `pnpm --filter frontend build` -> `built in 1.55s`, código de salida 0.
- `grep -n "TechniqueHelp|tecnica-pdf|explicacionCompleta|technique-help|tech-choice" apps packages tests` -> solo la aserción nueva `expect(info).not.toHaveProperty('explicacionCompleta')`.

Cambios respecto al plan (desvíos): ninguno. Se eliminaron además las reglas CSS `.technique-help*` y `.tech-choice` de `theme.css` y el envoltorio `.tech-choice` del JSX, tal como pedía la fase. Se sobrescribe el `FASE_F1_CIERRE.md` del plan anterior: queda en el historial de Git.

Pendientes y dudas: ninguno.
