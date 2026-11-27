import { TECNICAS_PROYECTO } from '@observatorio-ux/shared-types';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  salaId?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  /** Técnicas que se analizan en el proyecto; solo docente o administración la cambian. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos una técnica para analizar.' })
  @ArrayUnique()
  @IsIn(TECNICAS_PROYECTO, { each: true })
  tecnicasAnalizadas?: string[];
}

export class AddMemberDto {
  @IsEmail()
  email!: string;
}