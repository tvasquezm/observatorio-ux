import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateEquipoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}

export class UpdateEquipoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}

export class AddMiembroEquipoDto {
  @IsEmail()
  email!: string;
}
