// packages/shared-types/src/index.ts
//
// Barrel público del paquete.
//
// Auditoría 2026-08-04 (escalado a 5 metodologías): se agregan
// ux-artifact-base + los 3 dominios nuevos (persona, journey-map,
// momentos-criticos). `common/auth.schema.ts` sigue vacío — no se tocó
// en esta refactorización porque no tiene ningún consumidor real todavía.

export * from './common/base-payload.schema';
export * from './common/ux-artifact-base.schema';

export * from './domains/card-sorting';
export * from './domains/evaluacion-heuristica';
export * from './domains/persona';
export * from './domains/journey-map';
export * from './domains/momentos-criticos';
