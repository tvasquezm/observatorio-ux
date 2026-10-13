// src/modules/sessions/evaluacion-heuristica/dto/heuristica.dto.ts

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { HEURISTICA_IDS } from '@observatorio-ux/shared-types';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearSesionHeuristicaDto {
  @ApiPropertyOptional({ description: 'Nombre de la evaluación (sitio o producto evaluado)', example: 'Portal de matrículas' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  nombre?: string;
}

export class HeuristicaDto {
  @ApiProperty({ description: 'Heurística de Nielsen vulnerada', enum: HEURISTICA_IDS, example: 'H4' })
  @IsIn(HEURISTICA_IDS as unknown as string[])
  heuristicaId!: string;

  @ApiProperty({ description: 'Severidad de Nielsen del 0 al 4', minimum: 0, maximum: 4, example: 3 })
  @IsInt()
  @Min(0)
  @Max(4)
  severidad!: number;

  @ApiProperty({ description: 'Título corto del hallazgo', example: 'Botón principal sin etiqueta' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  titulo!: string;

  @ApiProperty({ description: 'Pantalla o elemento evaluado', example: 'Formulario de inscripción' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  pantalla!: string;

  @ApiProperty({ description: 'Descripción del problema', example: 'El botón de envío no tiene texto visible.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion!: string;

  @ApiProperty({ description: 'Evidencia observada (texto)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  evidencia!: string;

  @ApiPropertyOptional({ description: 'Enlace a la evidencia (solo http/https)', nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'evidenciaUrl debe ser una URL http(s) válida' })
  @MaxLength(500)
  evidenciaUrl?: string | null;

  @ApiPropertyOptional({ description: 'ID de una captura subida a esta misma sesión', nullable: true })
  @IsOptional()
  @IsUUID()
  evidenciaArchivoId?: string | null;

  @ApiProperty({ description: 'Acción concreta recomendada' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  recomendacion!: string;
}

// Edición parcial: cada campo conserva sus validaciones. `null` en
// evidenciaUrl / evidenciaArchivoId los elimina.
export class ActualizarHallazgoDto extends PartialType(HeuristicaDto) {}
