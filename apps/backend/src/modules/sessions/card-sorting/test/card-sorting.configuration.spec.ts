import { CardSortingService } from '../card-sorting.service';
import { CardSortingTypeDto } from '../dto/card-sorting.dto';
import { PrismaService } from '../../../../core/database/prisma.service';
import { ProjectAccessService } from '../../../../core/access/project-access.service';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface';

describe('Configuración de Card Sorting en la API', () => {
  const create = jest.fn();
  const access = jest.fn();
  const service = new CardSortingService(
    { researchSession: { create } } as unknown as PrismaService,
    { assertAccess: access } as unknown as ProjectAccessService,
  );
  const user = { id: 'researcher', rol: 'ESTUDIANTE' } as AuthenticatedUser;
  const valid = {
    proyectoId: '11111111-1111-4111-8111-111111111111', nombre: ' Navegación ',
    tipo: CardSortingTypeDto.CLOSED, tarjetas: [{ etiqueta: ' Biblioteca ' }],
    categorias: [{ nombre: ' Servicios ' }, { nombre: ' Vida universitaria ' }],
  };
  beforeEach(() => jest.clearAllMocks());

  it.each([
    { nombre: '   ' },
    { tarjetas: [{ etiqueta: '   ' }] },
    { tarjetas: [{ etiqueta: 'Biblioteca' }, { etiqueta: ' biblioteca ' }] },
    { categorias: [] },
    { categorias: [{ nombre: 'Solo una' }] },
    { tarjetas: [] },
    { categorias: [{ nombre: '   ' }] },
    { categorias: [{ nombre: 'Servicios' }, { nombre: ' servicios ' }] },
  ])('rechaza configuración inválida antes de persistir: %j', async (changes) => {
    await expect(service.createSession({ ...valid, ...changes }, user)).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it('normaliza y guarda un estudio cerrado válido', async () => {
    create.mockResolvedValue({ id: 'study' });
    const getSession = jest.spyOn(service, 'getSession').mockResolvedValue({ id: 'study' } as never);
    await service.createSession(valid, user);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      nombre: 'Navegación', tipoCardSorting: 'CERRADO',
      cardsDefinidas: { create: [{ etiqueta: 'Biblioteca' }] },
      categoriasDefinidas: { create: [{ nombre: 'Servicios', esPredefinida: true }, { nombre: 'Vida universitaria', esPredefinida: true }] },
    }) }));
    getSession.mockRestore();
  });
  it('conserva el estudio híbrido y las preguntas al aplicar la validación compartida', async () => {
    create.mockResolvedValue({ id: 'study' });
    const getSession = jest.spyOn(service, 'getSession').mockResolvedValue({ id: 'study' } as never);
    try {
      await service.createSession({ ...valid, tipo: CardSortingTypeDto.HYBRID,
        categorias: [{ nombre: ' Servicios ' }], preguntas: [{ texto: ' ¿Qué faltó? ' }],
      }, user);
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
        tipoCardSorting: 'HIBRIDO',
        categoriasDefinidas: { create: [{ nombre: 'Servicios', esPredefinida: true }] },
        preguntas: { create: [{ texto: '¿Qué faltó?', orden: 0 }] },
      }) }));
    } finally { getSession.mockRestore(); }
  });

});
