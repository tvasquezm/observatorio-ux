import {
  IsEmail,
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
}

export class AddMemberDto {
  @IsEmail()
  email!: string;
}