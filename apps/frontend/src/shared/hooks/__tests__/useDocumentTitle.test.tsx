import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from '../useDocumentTitle';

describe('useDocumentTitle', () => {
  it('antepone el título al nombre de la app y se actualiza al cambiar', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), { initialProps: { title: 'Proyectos' } });
    expect(document.title).toBe('Proyectos · Observatorio UX');
    rerender({ title: 'Salas' });
    expect(document.title).toBe('Salas · Observatorio UX');
  });

  it('sin título deja solo el nombre de la app', () => {
    renderHook(() => useDocumentTitle(''));
    expect(document.title).toBe('Observatorio UX');
  });
});
