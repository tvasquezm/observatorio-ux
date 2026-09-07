import { envValidationSchema } from '../env.validation';

describe('envValidationSchema (A4 fix smoke test)', () => {
  const base = {
    PORT: 3000,
    DATABASE_URL: 'postgresql://x',
    JWT_SECRET: '0123456789abcdef',
    JWT_PARTICIPANTE_SECRET: 'secret-participante',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
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
});
