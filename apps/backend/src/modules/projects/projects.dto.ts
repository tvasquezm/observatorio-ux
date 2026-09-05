import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
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

export class WhitelistEntryDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class AddToWhitelistDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes enviar al menos un email.' })
  @ValidateNested({ each: true })
  @Type(() => WhitelistEntryDto)
  participantes!: WhitelistEntryDto[];
}

export class AddMemberDto {
  @IsEmail()
  email!: string;
}