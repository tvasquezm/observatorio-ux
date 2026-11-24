import { envValidationSchema } from '../env.validation.js';

describe('envValidationSchema (A4 fix smoke test)', () => {
  const base = {
    PORT: 3000,
    DATABASE_URL: 'postgresql://x',
    JWT_SECRET: 'evaluador-secret-de-prueba-32-chars-min',
    JWT_PARTICIPANTE_SECRET: 'participante-secret-de-prueba-32-chars-min',
  };

  it('RECHAZA arrancar si NODE_ENV no está seteado (antes: defaulteaba a development)', () => {
    const { error } = envValidationSchema.validate(base);
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/NODE_ENV/);
  });

  it('TRUST_PROXY_HOPS: default 1 y rechaza valores fuera de rango', () => {
    const ok = envValidationSchema.validate({ ...base, NODE_ENV: 'production' });
    expect(ok.value.TRUST_PROXY_HOPS).toBe(1);
    const alto = envValidationSchema.validate({ ...base, NODE_ENV: 'production', TRUST_PROXY_HOPS: 99 });
    expect(alto.error).toBeDefined();
    const cero = envValidationSchema.validate({ ...base, NODE_ENV: 'production', TRUST_PROXY_HOPS: 0 });
    expect(cero.error).toBeDefined();
  });

  it('permite arrancar si NODE_ENV=production está seteado explícitamente', () => {
    const { error } = envValidationSchema.validate({ ...base, NODE_ENV: 'production' });
    expect(error).toBeUndefined();
  });

  it('valida la duración de la sesión de participante', () => {
    const env = { ...base, NODE_ENV: 'production' };
    expect(envValidationSchema.validate(env).value.JWT_PARTICIPANTE_EXPIRES_IN).toBe('4h');
    expect(envValidationSchema.validate({ ...env, JWT_PARTICIPANTE_EXPIRES_IN: '30m' }).error).toBeUndefined();
    expect(envValidationSchema.validate({ ...env, JWT_PARTICIPANTE_EXPIRES_IN: '30' }).error?.message)
      .toMatch(/JWT_PARTICIPANTE_EXPIRES_IN/);
  });

  it('rechaza secretos cortos o compartidos entre tipos de sesión', () => {
    const shortResult = envValidationSchema.validate({
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'demasiado-corto',
    });
    expect(shortResult.error?.message).toMatch(/JWT_SECRET/);

    const sharedSecret = 'un-mismo-secreto-no-debe-firmar-ambos-tokens';
    const sharedResult = envValidationSchema.validate({
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: sharedSecret,
      JWT_PARTICIPANTE_SECRET: sharedSecret,
    });
    expect(sharedResult.error?.message).toMatch(/distinto de JWT_SECRET/);
  });
});

describe('límite global de peticiones', () => {
  it('THROTTLE_LIMIT y THROTTLE_TTL_MS: defaults 60 por minuto y rechaza valores fuera de rango', () => {
    const base = { NODE_ENV: 'test', DATABASE_URL: 'postgresql://u:p@localhost:5432/db', JWT_SECRET: 'x'.repeat(32), JWT_PARTICIPANTE_SECRET: 'y'.repeat(32) };
    const ok = envValidationSchema.validate(base);
    expect(ok.value.THROTTLE_LIMIT).toBe(60);
    expect(ok.value.THROTTLE_TTL_MS).toBe(60000);
    expect(envValidationSchema.validate({ ...base, THROTTLE_LIMIT: 1500 }).error).toBeUndefined();
    expect(envValidationSchema.validate({ ...base, THROTTLE_LIMIT: 0 }).error).toBeDefined();
    expect(envValidationSchema.validate({ ...base, THROTTLE_TTL_MS: 10 }).error).toBeDefined();
  });
});
