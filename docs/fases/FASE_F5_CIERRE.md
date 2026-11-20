# FASE F5: Confirmación escrita, mecanismo y eliminar sala

Estado: hecha
Archivos tocados: `apps/frontend/src/shared/api/confirm.ts`, `apps/frontend/src/shared/components/ui/ConfirmDialog.tsx`, `apps/frontend/src/shared/components/ui/ConfirmDialog.test.tsx` (nuevo), `apps/frontend/src/features/salas/pages/ProfesorSalasPage.tsx`, `apps/frontend/src/features/salas/pages/ProfesorSalasPage.test.tsx`, `apps/frontend/src/styles/theme.css`.

Comandos ejecutados y resultado:
- `pnpm --filter frontend exec vitest run src/shared/components/ui/ConfirmDialog.test.tsx src/features/salas` -> 5 archivos, 35 pruebas en verde (7 nuevas del diálogo y 1 de la página de salas).
- `pnpm --filter frontend test` -> 81 archivos, 783 pruebas en verde.
- `pnpm --filter frontend build` -> `built in 1.56s`, código de salida 0.

Hecho:
- `askConfirm(message, { confirmLabel?, cancelLabel?, requireText? })` en `confirm.ts`; `ConfirmRequestDetail` lleva `requireText`.
- `ConfirmDialog`: solo con `requireText` agrega un campo con etiqueta visible `Escribe «nombre» para confirmar`, `aria-describedby` apuntando al mensaje del diálogo y foco inicial en el campo. La coincidencia es exacta tras normalizar Unicode (NFC) y recortar espacios, distingue mayúsculas y minúsculas, y admite pegar. El botón de confirmar queda deshabilitado hasta coincidir; Enter confirma solo si coincide; Escape cancela y deja el campo vacío. Sin `requireText`, el diálogo simple y su foco en Cancelar quedan igual.
- Aplicado a `handleEliminarSala` de `ProfesorSalasPage` con el texto actual del mensaje y `requireText: sala.nombre`.
- CSS: `.confirm-field`, `.confirm-field label/input` y `.confirm-btn:disabled` (área táctil de 44 px).

Cambios respecto al plan (desvíos): ninguno. El CSS del campo quedó en el commit de F4 (fases redactadas seguidas); no afecta el comportamiento.

Pendientes y dudas: ninguno.
