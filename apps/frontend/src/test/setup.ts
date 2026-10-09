// apps/frontend/src/test/setup.ts
import '@testing-library/jest-dom/vitest';

// jsdom no implementa el ciclo modal nativo; los flujos de foco se verifican también en Chromium.
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };

// Node ≥25 trae un `localStorage` global propio que pisa al de jsdom y no tiene `clear`.
// Se reemplaza por un Storage en memoria, aislado por archivo de test.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}
for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(window, name, { value: new MemoryStorage(), configurable: true, writable: true });
  Object.defineProperty(globalThis, name, { value: window[name], configurable: true, writable: true });
}
