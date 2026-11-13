import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFormDraft } from '../useFormDraft';
import { useAuthStore } from '../../../features/auth/store/useAuthStore';
import { getReturnTo, handleSessionExpired, safeReturnTo } from '../../auth/session-expired';
const user = { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE' as const };
function editor() {
  const [value, setValue] = useState({ name: '' });
  const draft = useFormDraft('test', value, setValue, { dirty: value.name !== '', enabled: true, onDiscard: () => setValue({ name: '' }) });
  return { value, setValue, draft };
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); useAuthStore.getState().setSession(user); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('debounce, restauración para el mismo usuario y limpieza al guardar', () => {
  const first = renderHook(editor);
  act(() => first.result.current.setValue({ name: 'Proyecto' }));
  expect(localStorage.getItem('observatorio-ux-draft:u1:test')).toBeNull();
  act(() => vi.advanceTimersByTime(800));
  first.unmount();
  const second = renderHook(editor);
  expect(second.result.current.value.name).toBe('Proyecto');
  expect(second.result.current.draft.restored).toBe(true);
  act(() => second.result.current.draft.clear());
  second.unmount();
  expect(localStorage.getItem('observatorio-ux-draft:u1:test')).toBeNull();
});
it('la expiración vacía el debounce; logout manual elimina sin resucitar el borrador', () => {
  const first = renderHook(editor);
  act(() => first.result.current.setValue({ name: 'Pendiente' }));
  act(() => handleSessionExpired('/proyectos/p1?tab=datos'));
  expect(JSON.parse(localStorage.getItem('observatorio-ux-draft:u1:test')!).value.name).toBe('Pendiente');
  expect(getReturnTo()).toBe('/proyectos/p1?tab=datos');
  first.unmount();
  act(() => useAuthStore.getState().setSession(user));
  const next = renderHook(editor);
  act(() => useAuthStore.getState().logout());
  next.unmount();
  expect(localStorage.getItem('observatorio-ux-draft:u1:test')).toBeNull();
});
it('ignora otro usuario y contenido inválido; Descarta el contenido recuperado', () => {
  localStorage.setItem('observatorio-ux-draft:u1:test', JSON.stringify({ userId: 'otro', value: { name: 'Ajeno' } }));
  const first = renderHook(editor); expect(first.result.current.value.name).toBe(''); first.unmount();
  localStorage.setItem('observatorio-ux-draft:u1:test', JSON.stringify({ userId: 'u1', value: { name: 42 } }));
  const malformed = renderHook(editor); expect(malformed.result.current.value.name).toBe(''); malformed.unmount();
  localStorage.setItem('observatorio-ux-draft:u1:test', JSON.stringify({ userId: 'u1', value: { name: 'Propio' } }));
  const own = renderHook(editor);
  act(() => own.result.current.draft.discard());
  expect(own.result.current.value.name).toBe('');
});
it.each(['//evil.test', 'https://evil.test', '/\\evil.test', '/\n/evil.test'])('rechaza returnTo externo o ambiguo %s', value => expect(safeReturnTo(value)).toBe('/'));
