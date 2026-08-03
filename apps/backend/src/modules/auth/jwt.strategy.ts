import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './types/authenticated-user.interface'; // <-- Ruta corregida (un solo punto)

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'secreto_super_seguro_de_tu_tesis', 
    });
  }

  async validate(payload: any): Promise<AuthenticatedUser> {
    return { 
      id: payload.sub || payload.id, 
      email: payload.email, 
      rol: payload.rol 
    };
  }
}