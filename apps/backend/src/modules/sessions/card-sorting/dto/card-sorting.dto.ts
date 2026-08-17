import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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
  etiqueta!: string;
}

class CategoriaDto {
  @IsString()
  @MinLength(1)
  nombre!: string;
}

export class CreateCardSortingSessionDto {
  @IsUUID()
  proyectoId!: string;

  @IsOptional()
  @IsEnum(CardSortingTypeDto)
  tipo?: CardSortingTypeDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TarjetaDto)
  tarjetas!: TarjetaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoriaDto)
  categorias?: CategoriaDto[];
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

export class SubmitCardSortingResultDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrupoDto)
  grupos!: GrupoDto[];
}
