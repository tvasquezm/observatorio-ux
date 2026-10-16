import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CLAVES_TECNICA_COMENTARIO } from '@observatorio-ux/shared-types';

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  artefactoLogicoId?: string;

  @IsOptional()
  @IsIn(CLAVES_TECNICA_COMENTARIO)
  tecnica?: string;

  @IsString()
  @MinLength(1)
  texto!: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  texto!: string;
}
