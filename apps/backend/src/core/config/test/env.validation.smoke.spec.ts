import { envValidationSchema } from '../env.validation';

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

  it('permite arrancar si NODE_ENV=production está seteado explícitamente', () => {
    const { error } = envValidationSchema.validate({ ...base, NODE_ENV: 'production' });
    expect(error).toBeUndefined();
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
