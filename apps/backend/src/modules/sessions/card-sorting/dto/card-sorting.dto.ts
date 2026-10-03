import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum CardSortingTypeDto {
  OPEN = 'ABIERTO',
  CLOSED = 'CERRADO',
}

class TarjetaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  etiqueta!: string;
}

class PreguntaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  texto!: string;
}

class CategoriaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  nombre!: string;
}

export class CreateCardSortingSessionDto {
  @IsUUID()
  proyectoId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsEnum(CardSortingTypeDto)
  tipo?: CardSortingTypeDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TarjetaDto)
  tarjetas!: TarjetaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoriaDto)
  categorias?: CategoriaDto[];

  // Paso 6 del curso: 0 a 5 preguntas opcionales para el participante.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PreguntaDto)
  preguntas?: PreguntaDto[];
}

class GrupoDto {
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  categoriaNombre?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  cardIds!: string[];
}

class RespuestaDto {
  @IsUUID()
  questionId!: string;

  @IsString()
  @MaxLength(1000)
  respuesta!: string;
}

export class SubmitCardSortingResultDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrupoDto)
  grupos!: GrupoDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => RespuestaDto)
  respuestas?: RespuestaDto[];
}

export class CerrarEstudioDto {
  @IsBoolean()
  cerrado!: boolean;
}
