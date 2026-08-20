// Pruebas unitarias — protección de propiedad (ownership) en Evaluación
// Heurística. Este es el bug de seguridad #1 detectado en la auditoría
// (deudas tecnicas/heuristica): cualquier usuario autenticado podía
// leer/editar/finalizar la sesión de OTRO evaluador solo conociendo el
// sesionId. Estas pruebas fijan ese comportamiento para que no se
// pueda romper de nuevo sin que el test falle.

import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoSesion, TipoSesion } from '@prisma/client';
import { EvaluacionHeuristicaService } from '../evaluacion-heuristica.service';
import { PrismaService } from '../../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface';

describe('EvaluacionHeuristicaService', () => {
  let service: EvaluacionHeuristicaService;
  let prisma: {
    researchSession: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
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
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EvaluacionHeuristicaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(EvaluacionHeuristicaService);
  });

  describe('obtenerSesion (ownership)', () => {
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
});