import { TipoArtefacto } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

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
