# FASE F11: Borradores con caducidad

Estado: hecha.

Archivos tocados: `useFormDraft.ts`, `useFormDraft.test.tsx`, `useAuthStore.ts`, `FormDraftNotice.tsx` y este cierre.

Los borradores se guardan con fecha y se descartan al intentar recuperarlos después de siete días o si carecen de fecha. Al iniciar sesión se eliminan los borradores de otras cuentas. El vencimiento de la sesión conserva el borrador de la cuenta activa. El aviso de recuperación incorpora el texto aprobado por el usuario.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/shared/hooks/__tests__/useFormDraft.test.tsx` → cuatro fallos esperados antes del cambio (fecha ausente, fechas vencidas y borrador ajeno).
- `pnpm --filter frontend test` → 82 archivos y 797 pruebas pasan. Incluye recuperación a seis días, descarte a siete y ocho días, purga al iniciar y conservación al expirar.
- `pnpm --filter frontend build` → salida 0.

Cambios respecto al plan: ninguno. Pendientes: ninguno.
