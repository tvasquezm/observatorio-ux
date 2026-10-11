import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Saltos de proxy de confianza delante del backend (ver main.ts).
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
}));
