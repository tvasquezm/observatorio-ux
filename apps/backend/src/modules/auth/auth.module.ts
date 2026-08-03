import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller'; // <-- 1. TIENE que estar importado aquí arriba

@Module({
  imports: [
    JwtModule.register({
      secret: 'secreto_super_seguro_de_tu_tesis',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController], // <-- 2. TIENE que estar dentro de este arreglo
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}