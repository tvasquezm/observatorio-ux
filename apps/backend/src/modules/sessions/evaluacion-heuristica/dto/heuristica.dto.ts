// src/modules/sessions/evaluacion-heuristica/dto/heuristica.dto.ts

import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeuristicaDto {
  @ApiProperty({ description: 'ID o código de la heurística', example: 'H4' })
  @IsString()
  @IsNotEmpty()
  heuristicaId!: string; // <-- El signo "!" le dice a TypeScript que NestJS lo inicializará

  @ApiProperty({ description: 'Severidad del 0 al 4', minimum: 0, maximum: 4, example: 3 })
  @IsInt()
  @Min(0)
  @Max(4)
  severidad!: number; // <-- Agregado el "!"

  @ApiProperty({ description: 'Descripción del problema', example: 'Falta botón.' })
  @IsString()
  @IsNotEmpty()
  descripcion!: string; // <-- Agregado el "!"

  @ApiPropertyOptional({ description: 'Evidencia opcional' })
  @IsString()
  @IsOptional()
  evidencia?: string; // Los opcionales usan "?" en lugar de "!"

  @ApiPropertyOptional({ description: 'Recomendación opcional' })
  @IsString()
  @IsOptional()
  recomendacion?: string;
}