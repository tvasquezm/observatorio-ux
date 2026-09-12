import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

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
  @IsUUID()
  @IsNotEmpty()
  usuarioId!: string;
}
