import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSalaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  periodo!: string;

  @IsString()
  @IsOptional()
  instrucciones?: string;
}