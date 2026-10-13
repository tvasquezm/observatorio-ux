// Ubicación: src/core/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // request.user es inyectado automáticamente por Passport/JwtStrategy
    return request.user; 
  },
);