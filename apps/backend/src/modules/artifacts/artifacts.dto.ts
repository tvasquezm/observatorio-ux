import { TipoArtefacto } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateArtifactDto {
  @IsEnum(TipoArtefacto)
  tipo!: TipoArtefacto;

  @IsOptional()
  @IsString()
  @MinLength(2)
  artefactoLogicoId?: string;

  @IsObject()
  contenido!: Record<string, unknown>;
}

export class CreateArtifactVersionDto {
  @IsObject()
  contenido!: Record<string, unknown>;
}

export class AcquireLockDto {
  /**
   * TTL opcional del bloqueo, en segundos. Si no se envía, el service usa
   * su default (5 min). El service también aplica un tope máximo (30 min)
   * aunque el cliente pida más.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1800)
  ttlSegundos?: number;
}
