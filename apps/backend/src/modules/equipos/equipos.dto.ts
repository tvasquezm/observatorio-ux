import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

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

export class ResolverRevisionAccesoDto {
  @IsIn(['QUITAR', 'MANTENER'])
  decision!: 'QUITAR' | 'MANTENER';
}
