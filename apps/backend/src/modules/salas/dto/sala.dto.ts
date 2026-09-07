import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  periodo!: string;

  @IsString()
  @IsOptional()
  instrucciones?: string;
}

export class CreateSalaEstudianteDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class BulkCreateSalaEstudiantesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes enviar al menos un estudiante.' })
  @ValidateNested({ each: true })
  @Type(() => CreateSalaEstudianteDto)
  estudiantes!: CreateSalaEstudianteDto[];
}

export class UpdateSalaEstudianteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class CreateProyectoEnSalaDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}