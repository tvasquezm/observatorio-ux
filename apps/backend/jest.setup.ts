// En modo ESM Jest no inyecta el global `jest`; los specs lo usan sin importarlo.
import { jest } from '@jest/globals';

(globalThis as unknown as { jest: typeof jest }).jest = jest;
