// apps/frontend/src/test/setup.ts
import '@testing-library/jest-dom/vitest';

// jsdom no implementa el ciclo modal nativo; los flujos de foco se verifican también en Chromium.
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };
