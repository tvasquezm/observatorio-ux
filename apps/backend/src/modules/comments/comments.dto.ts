import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  artefactoLogicoId?: string;

  @IsString()
  @MinLength(1)
  texto!: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  texto!: string;
}
