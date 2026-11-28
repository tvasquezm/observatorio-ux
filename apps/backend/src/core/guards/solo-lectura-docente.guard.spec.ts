import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { SoloLecturaDocenteGuard } from './solo-lectura-docente.guard.js';

const contexto = (method: string, rol?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ method, user: rol ? { rol } : undefined }) }) }) as unknown as ExecutionContext;

describe('SoloLecturaDocenteGuard', () => {
  const guard = new SoloLecturaDocenteGuard();

  it('el docente puede consultar', () => {
    for (const metodo of ['GET', 'HEAD', 'OPTIONS']) expect(guard.canActivate(contexto(metodo, 'DOCENTE'))).toBe(true);
  });

  it('el docente no puede crear, modificar ni eliminar', () => {
    for (const metodo of ['POST', 'PATCH', 'PUT', 'DELETE']) expect(() => guard.canActivate(contexto(metodo, 'DOCENTE'))).toThrow(ForbiddenException);
  });

  it('estudiantes y administración conservan sus permisos', () => {
    for (const rol of ['ESTUDIANTE', 'ADMIN']) expect(guard.canActivate(contexto('POST', rol))).toBe(true);
  });
});
