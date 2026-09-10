import { z } from 'zod';

export const EvaluatorRoleSchema = z.enum(['ESTUDIANTE', 'DOCENTE', 'ADMIN']);
export const UserRoleSchema = z.union([EvaluatorRoleSchema, z.literal('PARTICIPANTE')]);
export const AuthenticatedActorSchema = z.enum(['EVALUADOR', 'PARTICIPANTE']);

export const EvaluatorUserSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  email: z.string().email(),
  rol: EvaluatorRoleSchema,
});

export const LoginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginResponseSchema = z.object({
  user: EvaluatorUserSchema,
});

export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  rol: UserRoleSchema,
  actor: AuthenticatedActorSchema,
  proyectoId: z.string().uuid().optional(),
});

export type EvaluatorRole = z.infer<typeof EvaluatorRoleSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type AuthenticatedActor = z.infer<typeof AuthenticatedActorSchema>;
export type EvaluatorUser = z.infer<typeof EvaluatorUserSchema>;
export type LoginPayload = z.infer<typeof LoginPayloadSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
