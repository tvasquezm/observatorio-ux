import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard estándar que delega en la estrategia 'jwt' registrada con
 * @nestjs/passport (passport-jwt). Si tu proyecto ya tiene un
 * JwtAuthGuard en core/auth, ELIMINA este archivo y ajusta el import
 * en el controller para apuntar al existente.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
