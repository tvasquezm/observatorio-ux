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

  @IsString()
  @MinLength(16)
  codigoInvitacion!: string;
}

export class ParticipantAccessDto {
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

  @IsString()
  @MinLength(16)
  codigoInvitacion!: string;
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

  // Opcional desde Fase 1: solo aplica al flujo previo con whitelist. Un
  // participante de acceso abierto (accessParticipant) no tiene código
  // que enviar.
  @IsOptional()
  @IsString()
  @MinLength(16)
  codigoInvitacion?: string;
}
