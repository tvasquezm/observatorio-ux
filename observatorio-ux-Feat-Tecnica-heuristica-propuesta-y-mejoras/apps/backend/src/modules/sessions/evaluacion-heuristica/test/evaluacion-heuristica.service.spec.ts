// Pruebas unitarias — protección de propiedad (ownership) en Evaluación
// Heurística. Este es el bug de seguridad #1 detectado en la auditoría
// (deudas tecnicas/heuristica): cualquier usuario autenticado podía
// leer/editar/finalizar la sesión de OTRO evaluador solo conociendo el
// sesionId. Estas pruebas fijan ese comportamiento para que no se
// pueda romper de nuevo sin que el test falle.

import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSesion, TipoSesion } from '../../../../generated/prisma/client.js';
import { EvaluacionHeuristicaService } from '../evaluacion-heuristica.service.js';
import { PrismaService } from '../../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface.js';

describe('EvaluacionHeuristicaService', () => {
  let service: EvaluacionHeuristicaService;
  let prisma: {
    researchSession: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    usuario: { findUnique: jest.Mock };
    evidenciaHeuristica: { findFirst: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };

  const DUEÑO_ID = 'evaluador-dueño';
  const OTRO_ID = 'evaluador-intruso';
  const SESION_ID = 'sesion-123';

  const sesionDeEjemplo = {
    id: SESION_ID,
    tipo: TipoSesion.EVALUACION_HEURISTICA,
    evaluadorId: DUEÑO_ID,
    estado: EstadoSesion.EN_PROGRESO,
    resultado: [],
  };

  const userDueño: AuthenticatedUser = {
    id: DUEÑO_ID,
    rol: 'DOCENTE',
    actor: 'EVALUADOR',
  } as AuthenticatedUser;

  const userIntruso: AuthenticatedUser = {
    id: OTRO_ID,
    rol: 'ESTUDIANTE',
    actor: 'EVALUADOR',
  } as AuthenticatedUser;

  const userAdmin: AuthenticatedUser = {
    id: 'admin-1',
    rol: 'ADMIN',
    actor: 'EVALUADOR',
  } as AuthenticatedUser;

  beforeEach(async () => {
    prisma = {
      researchSession: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      usuario: { findUnique: jest.fn().mockResolvedValue({ id: DUEÑO_ID, nombre: 'Ana Evaluadora' }) },
      evidenciaHeuristica: { findFirst: jest.fn(), deleteMany: jest.fn() },
      // La transacción interactiva ejecuta el callback con el mismo mock.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
      $queryRaw: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EvaluacionHeuristicaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectAccessService, useValue: { assertAccess: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(EvaluacionHeuristicaService);
  });

  describe('obtenerSesion (ownership)', () => {
    it('el informe del evaluador consulta únicamente sus sesiones y omite identidades', async () => {
      prisma.researchSession.findMany.mockResolvedValue([]);
      await service.listarSesiones('proyecto-1', userDueño);
      expect(prisma.researchSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { proyectoId: 'proyecto-1', tipo: TipoSesion.EVALUACION_HEURISTICA, evaluadorId: DUEÑO_ID },
        select: { id: true, proyectoId: true, nombre: true, estado: true, resultado: true, createdAt: true, completadoAt: true },
      }));
    });

    it('el informe del administrador puede consultar todas las sesiones del proyecto', async () => {
      prisma.researchSession.findMany.mockResolvedValue([]);
      await service.listarSesiones('proyecto-1', userAdmin);
      expect(prisma.researchSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { proyectoId: 'proyecto-1', tipo: TipoSesion.EVALUACION_HEURISTICA },
      }));
    });
    it('permite al evaluador dueño de la sesión leerla', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);

      await expect(service.obtenerSesion(SESION_ID, userDueño)).resolves.toEqual(
        sesionDeEjemplo,
      );
    });

    it('RECHAZA a un evaluador que NO es dueño de la sesión (bug IDOR original)', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);

      await expect(service.obtenerSesion(SESION_ID, userIntruso)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('permite a un usuario ADMIN leer la sesión de cualquier evaluador', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);

      await expect(service.obtenerSesion(SESION_ID, userAdmin)).resolves.toEqual(
        sesionDeEjemplo,
      );
    });

    it('devuelve 404 si la sesión no existe', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(null);

      await expect(service.obtenerSesion('no-existe', userDueño)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve 404 si el id corresponde a una sesión de OTRA técnica (ej. Card Sorting)', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({
        ...sesionDeEjemplo,
        tipo: TipoSesion.CARD_SORTING,
      });

      await expect(service.obtenerSesion(SESION_ID, userDueño)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('finalizarSesion', () => {
    it('un evaluador intruso NO puede finalizar la sesión de otro', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);

      await expect(service.finalizarSesion(SESION_ID, userIntruso)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.researchSession.update).not.toHaveBeenCalled();
    });

    it('el dueño sí puede finalizar su propia sesión en progreso', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
      prisma.researchSession.update.mockResolvedValue({
        ...sesionDeEjemplo,
        estado: EstadoSesion.COMPLETADO,
      });

      const result = await service.finalizarSesion(SESION_ID, userDueño);
      expect(result.estado).toBe(EstadoSesion.COMPLETADO);
    });
  });

  describe('crearSesion', () => {
    it('fija el nombre (el default del modelo es "Card Sorting") y el evaluador', async () => {
      prisma.researchSession.create.mockResolvedValue({ id: SESION_ID });
      await service.crearSesion('proyecto-1', {}, userDueño);
      expect(prisma.researchSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Evaluación heurística',
          evaluadorId: DUEÑO_ID,
          tipo: TipoSesion.EVALUACION_HEURISTICA,
        }),
      });
    });

    it('usa el nombre recortado cuando se informa', async () => {
      prisma.researchSession.create.mockResolvedValue({ id: SESION_ID });
      await service.crearSesion('proyecto-1', { nombre: '  Portal de matrículas ' }, userDueño);
      expect(prisma.researchSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ nombre: 'Portal de matrículas' }),
      });
    });
  });

  describe('hallazgos', () => {
    const EVID_ID = 'evidencia-1';
    const dto = {
      heuristicaId: 'H4',
      severidad: 3,
      titulo: '  Botón sin etiqueta ',
      pantalla: 'Formulario de inscripción',
      descripcion: 'El botón de envío no tiene texto visible.',
      evidencia: 'Se ve solo un ícono.',
      recomendacion: 'Agregar la etiqueta "Enviar".',
    };
    const hallazgoExistente = {
      id: 'h-1',
      heuristicaId: 'H1',
      severidad: 2,
      titulo: 'Sin feedback',
      pantalla: 'Login',
      descripcion: 'No hay indicador de carga al enviar.',
      evidencia: 'Se queda congelado.',
      evidenciaArchivoId: EVID_ID,
      recomendacion: 'Mostrar spinner.',
      responsable: { id: DUEÑO_ID, nombre: 'Ana Evaluadora' },
      registradoEn: '2026-10-01T00:00:00.000Z',
    };

    beforeEach(() => {
      prisma.researchSession.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...sesionDeEjemplo, ...data }),
      );
    });

    it('registra el hallazgo sellando el responsable desde el usuario autenticado', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
      const r = await service.registrarHallazgo(SESION_ID, dto, userDueño);
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: DUEÑO_ID },
        select: { id: true, nombre: true },
      });
      expect(r.hallazgo.responsable).toEqual({ id: DUEÑO_ID, nombre: 'Ana Evaluadora' });
      expect(r.hallazgo.titulo).toBe('Botón sin etiqueta');
      expect(r.hallazgo.evidenciaUrl).toBeNull();
      expect(prisma.$queryRaw).toHaveBeenCalled(); // bloqueo FOR UPDATE
    });

    it('rechaza hallazgos en una sesión cerrada (409)', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({ ...sesionDeEjemplo, estado: EstadoSesion.COMPLETADO });
      await expect(service.registrarHallazgo(SESION_ID, dto, userDueño)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.researchSession.update).not.toHaveBeenCalled();
    });

    it('rechaza a un intruso', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
      await expect(service.registrarHallazgo(SESION_ID, dto, userIntruso)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza una captura que no pertenece a la sesión (400)', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
      prisma.evidenciaHeuristica.findFirst.mockResolvedValue(null);
      await expect(
        service.registrarHallazgo(SESION_ID, { ...dto, evidenciaArchivoId: EVID_ID }, userDueño),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.evidenciaHeuristica.findFirst).toHaveBeenCalledWith({
        where: { id: EVID_ID, sesionId: SESION_ID },
        select: { id: true },
      });
    });

    it('actualiza solo los campos enviados y marca actualizadoEn', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({ ...sesionDeEjemplo, resultado: [hallazgoExistente] });
      const r = await service.actualizarHallazgo('s', 'h-1', { severidad: 4, titulo: ' Nuevo ' }, userDueño);
      expect(r.hallazgo.severidad).toBe(4);
      expect(r.hallazgo.titulo).toBe('Nuevo');
      expect(r.hallazgo.pantalla).toBe('Login');
      expect(r.hallazgo.responsable).toEqual(hallazgoExistente.responsable);
      expect(r.hallazgo.actualizadoEn).toBeDefined();
      expect(prisma.evidenciaHeuristica.deleteMany).not.toHaveBeenCalled();
    });

    it('al quitar la captura (null) la borra si ningún otro hallazgo la usa', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({ ...sesionDeEjemplo, resultado: [hallazgoExistente] });
      await service.actualizarHallazgo(SESION_ID, 'h-1', { evidenciaArchivoId: null }, userDueño);
      expect(prisma.evidenciaHeuristica.deleteMany).toHaveBeenCalledWith({
        where: { id: EVID_ID, sesionId: SESION_ID },
      });
    });

    it('no borra la captura si otro hallazgo la sigue referenciando', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({
        ...sesionDeEjemplo,
        resultado: [hallazgoExistente, { ...hallazgoExistente, id: 'h-2' }],
      });
      await service.actualizarHallazgo(SESION_ID, 'h-1', { evidenciaArchivoId: null }, userDueño);
      expect(prisma.evidenciaHeuristica.deleteMany).not.toHaveBeenCalled();
    });

    it('404 al editar un hallazgo inexistente', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
      await expect(service.actualizarHallazgo('s', 'h-x', { severidad: 1 }, userDueño)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('elimina el hallazgo y su captura', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({ ...sesionDeEjemplo, resultado: [hallazgoExistente] });
      const r = await service.eliminarHallazgo(SESION_ID, 'h-1', userDueño);
      expect(prisma.researchSession.update).toHaveBeenCalledWith({
        where: { id: SESION_ID },
        data: { resultado: [] },
      });
      expect(prisma.evidenciaHeuristica.deleteMany).toHaveBeenCalledWith({
        where: { id: EVID_ID, sesionId: SESION_ID },
      });
      expect(r.mensaje).toMatch(/eliminado/);
    });

    it('404 al eliminar un hallazgo inexistente y 409 si la sesión está cerrada', async () => {
      prisma.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
      await expect(service.eliminarHallazgo(SESION_ID, 'h-x', userDueño)).rejects.toBeInstanceOf(NotFoundException);
      prisma.researchSession.findUnique.mockResolvedValue({ ...sesionDeEjemplo, estado: EstadoSesion.COMPLETADO });
      await expect(service.eliminarHallazgo(SESION_ID, 'h-1', userDueño)).rejects.toBeInstanceOf(ConflictException);
    });

    it('al finalizar limpia las capturas huérfanas conservando las referenciadas', async () => {
      prisma.researchSession.findUnique.mockResolvedValue({ ...sesionDeEjemplo, resultado: [hallazgoExistente] });
      prisma.researchSession.update.mockResolvedValue({ ...sesionDeEjemplo, estado: EstadoSesion.COMPLETADO });
      await service.finalizarSesion(SESION_ID, userDueño);
      expect(prisma.evidenciaHeuristica.deleteMany).toHaveBeenCalledWith({
        where: { sesionId: SESION_ID, id: { notIn: [EVID_ID] } },
      });
    });
  });

  describe('obtenerAnalitica', () => {
    it('cuenta por severidad y por heurística; los legados fuera de catálogo van a sinClasificar', async () => {
      prisma.researchSession.findMany.mockResolvedValue([
        {
          estado: EstadoSesion.COMPLETADO,
          resultado: [
            { heuristicaId: 'H4', severidad: 3 },
            { heuristicaId: 'H4', severidad: 4 },
            { heuristicaId: 'consistencia', severidad: 1 },
          ],
        },
        { estado: EstadoSesion.EN_PROGRESO, resultado: null },
      ]);
      const r = await service.obtenerAnalitica('proyecto-1', userDueño);
      expect(r.sesionesTotal).toBe(2);
      expect(r.sesionesCompletadas).toBe(1);
      expect(r.hallazgosTotal).toBe(3);
      expect(r.porSeveridad[3]).toEqual({ severidad: 3, count: 1, porcentaje: 33 });
      expect(r.porHeuristica).toHaveLength(10);
      expect(r.porHeuristica.find((h) => h.heuristicaId === 'H4')?.count).toBe(2);
      expect(r.sinClasificar).toBe(1);
    });
  });
});
