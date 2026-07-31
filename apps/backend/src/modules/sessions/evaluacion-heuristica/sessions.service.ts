import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionsService {
  crearSesion(proyectoId: string, usuarioId: string) {
    return { proyectoId, usuarioId };
  }

  actualizarParcial(
    sesionId: string,
    body: unknown,
    usuario: unknown,
  ) {
    return { sesionId, body, usuario };
  }

  finalizar(sesionId: string, usuario: unknown) {
    return { sesionId, usuario };
  }

  obtenerSesion(sesionId: string, usuario: unknown) {
    return { sesionId, usuario };
  }
}