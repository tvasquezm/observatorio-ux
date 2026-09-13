import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Para endpoints que un mismo route sirve tanto a EVALUADOR (Usuario
// logueado, cookie httpOnly `evaluadorToken`) como a PARTICIPANTE externo
// (Authorization: Bearer `participanteToken`) — hoy solo Card Sorting.
//
// Se prueba 'jwt-participante' PRIMERO porque esa estrategia únicamente
// mira el header Authorization (nunca la cookie). Así, si el mismo
// navegador tiene además una cookie de evaluador válida (caso típico:
// el Estudiante que creó la técnica abre su propio enlace de
// participante para probarlo), esa cookie no "gana" por accidente sobre
// el participanteToken real que mandó el cliente — bug que reproducía
// exactamente "No tienes acceso a esta sesión." al participante.
//
// Si no hay Bearer o no es un participanteToken válido, Passport cae a
// 'jwt' (evaluador: cookie o bearer con el secreto de evaluador).
@Injectable()
export class JwtAnyActorGuard extends AuthGuard(['jwt-participante', 'jwt']) {}
