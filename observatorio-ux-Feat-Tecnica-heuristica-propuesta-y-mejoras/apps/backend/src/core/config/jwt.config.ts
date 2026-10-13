import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  // Secreto independiente para participanteToken (Regla de negocio: Segregación
  // de Auth). Evita que evaluadorToken y participanteToken compartan la misma
  // clave de firma — cada uno solo puede validarse contra su propia estrategia.
  participanteSecret: process.env.JWT_PARTICIPANTE_SECRET,
  participanteExpiresIn: process.env.JWT_PARTICIPANTE_EXPIRES_IN || '4h',
}));
