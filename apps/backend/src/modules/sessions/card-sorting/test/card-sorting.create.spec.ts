import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface.js';
import { CardSortingService } from '../card-sorting.service.js';
import { CreateCardSortingSessionDto } from '../dto/card-sorting.dto.js';
import { validarEntradaEstudio } from '../card-sorting-input.js';

const PROYECTO = '3f2b8f0e-5c1d-4e3a-9a77-2d6f4b1c9e10';

async function erroresDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateCardSortingSessionDto, {
    proyectoId: PROYECTO,
    nombre: 'Estudio',
    tipo: 'ABIERTO',
    tarjetas: [{ etiqueta: 'Biblioteca' }],
    ...payload,
  });
  return validate(dto);
}

describe('CreateCardSortingSessionDto · límites', () => {
  it('acepta una etiqueta de 100 caracteres y rechaza una de 101', async () => {
    expect(await erroresDto({ tarjetas: [{ etiqueta: 'a'.repeat(100) }] })).toHaveLength(0);
    expect(await erroresDto({ tarjetas: [{ etiqueta: 'a'.repeat(101) }] })).not.toHaveLength(0);
  });

  it('acepta 100 tarjetas y rechaza 101', async () => {
    const tarjetas = (n: number) => Array.from({ length: n }, (_, i) => ({ etiqueta: `T${i}` }));
    expect(await erroresDto({ tarjetas: tarjetas(100) })).toHaveLength(0);
    expect(await erroresDto({ tarjetas: tarjetas(101) })).not.toHaveLength(0);
  });

  it('acepta una categoría de 60 caracteres y rechaza una de 61', async () => {
    const base = { tipo: 'CERRADO' };
    expect(
      await erroresDto({ ...base, categorias: [{ nombre: 'c'.repeat(60) }, { nombre: 'B' }] }),
    ).toHaveLength(0);
    expect(
      await erroresDto({ ...base, categorias: [{ nombre: 'c'.repeat(61) }, { nombre: 'B' }] }),
    ).not.toHaveLength(0);
  });
});

describe('validarEntradaEstudio', () => {
  it('rechaza tarjetas duplicadas aunque cambien tildes o mayúsculas', () => {
    expect(() => validarEntradaEstudio(false, ['Navegación', 'navegacion'], [])).toThrow(
      /tarjetas duplicadas: "Navegación"/,
    );
  });

  it('rechaza tarjetas o categorías que son solo espacios', () => {
    expect(() => validarEntradaEstudio(false, ['Biblioteca', '   '], [])).toThrow(
      'Las tarjetas no pueden estar vacías.',
    );
    expect(() => validarEntradaEstudio(true, ['A'], ['X', '  '])).toThrow(
      'Las categorías no pueden estar vacías.',
    );
  });

  it('rechaza categorías duplicadas', () => {
    expect(() => validarEntradaEstudio(true, ['A'], ['Servicios', 'servicios'])).toThrow(
      /categorías duplicadas/,
    );
  });

  it('cerrado exige al menos 2 categorías; abierto no exige ninguna', () => {
    expect(() => validarEntradaEstudio(true, ['A'], ['Solo una'])).toThrow(
      'Un Card Sorting cerrado requiere al menos dos categorías predefinidas.',
    );
    expect(() => validarEntradaEstudio(true, ['A'], ['Una', 'Dos'])).not.toThrow();
    expect(() => validarEntradaEstudio(false, ['A'], [])).not.toThrow();
  });

  it('híbrido exige al menos 1 categoría predefinida', () => {
    expect(() => validarEntradaEstudio(false, ['A'], [], true)).toThrow(
      'Un Card Sorting híbrido requiere al menos una categoría predefinida.',
    );
    expect(() => validarEntradaEstudio(false, ['A'], ['Una'], true)).not.toThrow();
  });

  it('el DTO acepta tipo HIBRIDO', async () => {
    expect(
      await erroresDto({ tipo: 'HIBRIDO', categorias: [{ nombre: 'Una' }] }),
    ).toHaveLength(0);
  });

  it('resume la lista cuando hay más de 5 duplicados', () => {
    const base = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(() => validarEntradaEstudio(false, [...base, ...base], [])).toThrow(/y 2 más/);
  });
});

describe('CardSortingService.createSession · validación de entrada', () => {
  const user = { id: 'evaluador-1', rol: 'ESTUDIANTE', actor: 'EVALUADOR' } as AuthenticatedUser;

  function createService() {
    const prisma = { researchSession: { create: jest.fn().mockResolvedValue({ id: 'estudio-1' }) } };
    const projectAccess = { assertAccess: jest.fn() };
    const service = new CardSortingService(
      prisma as unknown as PrismaService,
      projectAccess as unknown as ProjectAccessService,
    );
    jest.spyOn(service, 'getSession').mockResolvedValue({ id: 'estudio-1' } as never);
    return { prisma, service };
  }

  function dto(parcial: Partial<CreateCardSortingSessionDto>) {
    return {
      proyectoId: PROYECTO,
      nombre: 'Estudio',
      tarjetas: [{ etiqueta: 'Biblioteca' }, { etiqueta: 'Calendario' }],
      ...parcial,
    } as CreateCardSortingSessionDto;
  }

  it('cerrado con 1 sola categoría da 400 y no escribe en la base', async () => {
    const { prisma, service } = createService();
    await expect(
      service.createSession(dto({ tipo: 'CERRADO' as never, categorias: [{ nombre: 'Servicios' }] }), user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.researchSession.create).not.toHaveBeenCalled();
  });

  it('tarjetas duplicadas dan 400 y no escriben en la base', async () => {
    const { prisma, service } = createService();
    await expect(
      service.createSession(dto({ tarjetas: [{ etiqueta: 'Biblioteca' }, { etiqueta: 'BIBLIOTECA' }] }), user),
    ).rejects.toThrow(/tarjetas duplicadas/);
    expect(prisma.researchSession.create).not.toHaveBeenCalled();
  });

  it('una entrada válida crea el estudio', async () => {
    const { prisma, service } = createService();
    await service.createSession(
      dto({ tipo: 'CERRADO' as never, categorias: [{ nombre: 'Servicios' }, { nombre: 'Vida universitaria' }] }),
      user,
    );
    expect(prisma.researchSession.create).toHaveBeenCalledTimes(1);
  });
});
