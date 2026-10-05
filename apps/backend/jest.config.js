/** @type {import('jest').Config} */
export default {
  rootDir: '.',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      // 151002: aviso de ts-jest por module nodenext; no afecta el chequeo de tipos.
      { tsconfig: 'tsconfig.json', useESM: true, diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  // Los imports relativos llevan extensión .js (ESM); ts-jest resuelve el .ts.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
};
