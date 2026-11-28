import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const METODOS_DE_LECTURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * El docente consulta, no produce: en las técnicas que trabajan los estudiantes (card sorting y
 * evaluación heurística) puede ver todo lo de sus proyectos, pero no crear ni modificar nada.
 * Va después de JwtAuthGuard, que es quien deja al usuario en la petición.
 */
@Injectable()
export class SoloLecturaDocenteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ method: string; user?: { rol?: string } }>();
    if (request.user?.rol === 'DOCENTE' && !METODOS_DE_LECTURA.has(request.method.toUpperCase())) {
      throw new ForbiddenException('Como docente solo puedes consultar esta técnica: crear y editar lo hacen los estudiantes.');
    }
    return true;
  }
}
