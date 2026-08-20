import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ParticipantTokenDto {
  @IsUUID()
  participanteId!: string;

  @IsUUID()
  proyectoId!: string;
}

export class RegisterParticipantDto {
  @IsUUID()
  proyectoId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class RegisterParticipantConsentDto {
  @IsUUID()
  participanteId!: string;

  @IsUUID()
  proyectoId!: string;

  @IsBoolean()
  aceptado!: boolean;

  @IsString()
  @MinLength(1)
  version!: string;
}
