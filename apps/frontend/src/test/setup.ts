// apps/frontend/src/test/setup.ts
import '@testing-library/jest-dom/vitest';

// Node 25+ expone un `localStorage` global propio que tapa el de jsdom y no
// trae `clear`/`getItem`/etc. Si el entorno no trae uno utilizable, se instala
// un Storage en memoria.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(String(key)) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(String(key));
    },
    setItem: (key, value) => {
      data.set(String(key), String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}
