import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

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
