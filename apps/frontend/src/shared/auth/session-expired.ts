import { useAuthStore } from '../../features/auth/store/useAuthStore';

const RETURN_TO = 'observatorio-ux-returnTo';
export function safeReturnTo(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  try { return new URL(value, window.location.origin).origin === window.location.origin ? value : '/'; } catch { return '/'; }
}
export function getReturnTo(): string {
  const value = sessionStorage.getItem(RETURN_TO);
  return safeReturnTo(value);
}
export function handleSessionExpired(path = window.location.pathname + window.location.search) {
  if (useAuthStore.getState().sessionEnding) return;
  if (path !== '/login') sessionStorage.setItem(RETURN_TO, safeReturnTo(path));
  window.dispatchEvent(new Event('observatorio-ux-flush-drafts'));
  useAuthStore.getState().expireSession();
}
