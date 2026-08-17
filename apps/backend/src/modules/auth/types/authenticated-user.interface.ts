export type EvaluatorRole = 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';
export type UserRole = EvaluatorRole | 'PARTICIPANTE';
export type AuthenticatedActor = 'EVALUADOR' | 'PARTICIPANTE';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  rol: UserRole;
  actor: AuthenticatedActor;
  proyectoId?: string;
}
