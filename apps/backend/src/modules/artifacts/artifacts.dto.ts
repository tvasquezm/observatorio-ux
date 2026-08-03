// apps/backend/src/features/artifacts/dto/artifacts.dto.ts
//
// Contratos Zod para el módulo de Artifacts.
// Asume el patrón de nestjs-zod (createZodDto) que ya usan en el resto
// del backend para integrarse con el ValidationPipe global
// (whitelist: true, forbidNonWhitelisted: true).

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// El body de "crear versión" solo trae el nuevo contenido del artefacto.
// El resto (proyectoId, tipo, artefactoLogicoId, version, autorId) lo
// derivamos en el servicio a partir de la fila actual y del usuario
// autenticado — nunca confiamos en esos campos si vinieran del cliente.
export const CreateVersionSchema = z.object({
  contenido: z.record(z.string(), z.any()),
});

export class CreateVersionDto extends createZodDto(CreateVersionSchema) {}
