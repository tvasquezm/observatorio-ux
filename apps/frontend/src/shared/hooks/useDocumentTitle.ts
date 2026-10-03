// apps/frontend/src/shared/hooks/useDocumentTitle.ts

import { useEffect } from 'react';

export const APP_TITLE = 'Observatorio UX';

/** Fija document.title como "{title} · Observatorio UX"; sin título, solo el nombre de la app. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);
}
