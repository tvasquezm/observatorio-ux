import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el usuario que Passport adjunta a `request.user` tras validar
 * el JWT (normalmente lo hace el `validate()` de tu JwtStrategy).
 *
 * Uso: joinSession(@CurrentUser() user: AuthenticatedUser)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
