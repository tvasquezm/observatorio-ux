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

  it('permite arrancar sin variables GOOGLE_* (login con Google es opcional)', () => {
    const { error } = envValidationSchema.validate({ ...base, NODE_ENV: 'production' });
    expect(error).toBeUndefined();
  });

  it('acepta GOOGLE_* vacías (env.example las trae en blanco)', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      NODE_ENV: 'development',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      GOOGLE_CALLBACK_URL: '',
    });
    expect(error).toBeUndefined();
  });

  it('rechaza GOOGLE_CALLBACK_URL que no sea una URL', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      NODE_ENV: 'development',
      GOOGLE_CALLBACK_URL: 'no-es-url',
    });
    expect(error).toBeDefined();
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
