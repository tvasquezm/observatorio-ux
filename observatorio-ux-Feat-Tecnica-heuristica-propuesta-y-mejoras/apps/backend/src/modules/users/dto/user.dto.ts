import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { EvaluatorRole } from '@observatorio-ux/shared-types';

const USER_ROLES: EvaluatorRole[] = ['ESTUDIANTE', 'DOCENTE', 'ADMIN'];

export class CreateDocenteDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  rol!: EvaluatorRole;
}
