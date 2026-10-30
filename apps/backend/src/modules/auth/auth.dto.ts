import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class GoogleLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  credential!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

export class ParticipantTokenDto {
  @IsUUID()
  participanteId!: string;

  @IsUUID()
  proyectoId!: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  codigoInvitacion?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  resumeToken?: string;
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

  // Requerido para el flujo de acceso abierto (sin whitelist): credencial
  // que ya se le entregó al participante en accessParticipant, igual que en
  // ParticipantTokenDto. Sin whitelist ni resumeToken, la request se rechaza.
  @IsOptional()
  @IsString()
  @MinLength(32)
  resumeToken?: string;
}
