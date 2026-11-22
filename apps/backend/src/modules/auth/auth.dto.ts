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
  @MinLength(32)
  resumeToken?: string;
}

export class ParticipantAccessDto {
  @IsUUID()
  proyectoId!: string;
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

  // Credencial que ya se le entregó al participante en accessParticipant,
  // igual que en ParticipantTokenDto. Sin resumeToken, la request se rechaza.
  @IsOptional()
  @IsString()
  @MinLength(32)
  resumeToken?: string;
}
