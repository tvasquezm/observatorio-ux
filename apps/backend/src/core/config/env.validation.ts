import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Antes tenía `.default('development')`. Eso significa que si en
  // producción alguien se olvida de setear NODE_ENV, la app arranca
  // igual pero en modo "development" — y con eso, endpoints gateados por
  // `nodeEnv !== 'production'` (como /auth/test-token y
  // /auth/test-participant-token) quedan expuestos sin que nadie se dé
  // cuenta. Se cambia a `.required()`: si falta, la app NO arranca, en vez
  // de arrancar silenciosamente en el modo equivocado. Ver A4 / hallazgo de
  // auditoría (docs/ARCHITECTURE.md).
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
});
