import { describe, expect, it } from 'vitest';
import type { EvaluatorRole, EvaluatorUser } from '../../../features/auth/api/auth.api';
import {
  canUsePerspective,
  isEvaluatorRole,
  readStoredPerspective,
  resolvePerspective,
  storePerspective,
} from '../perspectivas';

const user = (rol: EvaluatorRole): EvaluatorUser => ({
  id: `user-${rol}`,
  nombre: rol,
  email: `${rol.toLowerCase()}@example.com`,
  rol,
});

describe('política de perspectivas', () => {
  it('limita cada cuenta a las perspectivas solicitadas', () => {
    expect(canUsePerspective('ESTUDIANTE', 'ESTUDIANTE')).toBe(true);
    expect(canUsePerspective('ESTUDIANTE', 'DOCENTE')).toBe(false);
    expect(canUsePerspective('ESTUDIANTE', 'ADMIN')).toBe(false);

    expect(canUsePerspective('DOCENTE', 'ESTUDIANTE')).toBe(true);
    expect(canUsePerspective('DOCENTE', 'DOCENTE')).toBe(true);
    expect(canUsePerspective('DOCENTE', 'ADMIN')).toBe(false);

    expect(canUsePerspective('ADMIN', 'ESTUDIANTE')).toBe(true);
    expect(canUsePerspective('ADMIN', 'DOCENTE')).toBe(true);
    expect(canUsePerspective('ADMIN', 'ADMIN')).toBe(true);
  });

  it('vuelve al rol real si se intenta forzar una perspectiva prohibida', () => {
    expect(resolvePerspective('ESTUDIANTE', 'ADMIN')).toBe('ESTUDIANTE');
    expect(resolvePerspective('DOCENTE', 'ADMIN')).toBe('DOCENTE');
  });

  it('guarda la preferencia por cuenta solo durante la sesión del navegador', () => {
    const admin = user('ADMIN');
    storePerspective(admin, 'ESTUDIANTE', sessionStorage);

    expect(readStoredPerspective(admin, sessionStorage)).toBe('ESTUDIANTE');
    expect(readStoredPerspective(user('DOCENTE'), sessionStorage)).toBe('DOCENTE');
  });

  it('descarta datos manipulados en storage', () => {
    sessionStorage.setItem(
      'observatorio-ux-perspective:v1',
      JSON.stringify({ userId: 'user-DOCENTE', role: 'ADMIN' }),
    );

    expect(readStoredPerspective(user('DOCENTE'), sessionStorage)).toBe('DOCENTE');
  });

  it('rechaza roles desconocidos antes de leer la caché', () => {
    expect(isEvaluatorRole('ADMIN')).toBe(true);
    expect(isEvaluatorRole('SUPERADMIN')).toBe(false);
    expect(canUsePerspective('SUPERADMIN' as EvaluatorRole, 'ADMIN')).toBe(false);
  });
});
