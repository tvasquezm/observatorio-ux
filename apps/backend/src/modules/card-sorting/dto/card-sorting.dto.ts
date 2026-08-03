import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

class TarjetaDto {
  @IsString()
  etiqueta!: string;
}

class CategoriaDto {
  @IsString()
  nombre!: string;
}

export class CreateCardSortingSessionDto {
  @IsUUID()
  proyectoId!: string;

  @IsOptional()
  @IsEnum(['ABIERTO', 'CERRADO'])
  tipo?: 'ABIERTO' | 'CERRADO';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TarjetaDto)
  tarjetas!: TarjetaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoriaDto)
  categorias?: CategoriaDto[] = [];
}

// JoinCardSortingSessionDto fue eliminado: el participanteId ya NO viaja
// en el Body. Ahora /join no requiere Body — el id sale del JWT.

class GrupoDto {
  @IsString()
  categoriaNombre!: string;

  @IsArray()
  @IsString({ each: true })
  cardIds!: string[];
}

export class SubmitCardSortingResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrupoDto)
  grupos!: GrupoDto[];
}