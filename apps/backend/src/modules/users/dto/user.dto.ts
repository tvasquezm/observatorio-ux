import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import type { EvaluatorRole } from '@observatorio-ux/shared-types';

const USER_ROLES: EvaluatorRole[] = ['ESTUDIANTE', 'DOCENTE', 'ADMIN'];

export class CreateDocenteDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(['PASSWORD', 'GOOGLE'])
  acceso?: 'PASSWORD' | 'GOOGLE';

  @ValidateIf((dto: CreateDocenteDto) => dto.acceso !== 'GOOGLE')
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  rol!: EvaluatorRole;
}
