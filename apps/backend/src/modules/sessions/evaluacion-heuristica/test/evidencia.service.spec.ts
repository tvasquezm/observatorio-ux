import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { EstadoSesion } from '../../../../generated/prisma/client.js';
import { EVIDENCIA_MAX_BYTES, EVIDENCIA_MAX_POR_SESION } from '@observatorio-ux/shared-types';
import { PrismaService } from '../../../../core/database/prisma.service.js';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface.js';
import { EvaluacionHeuristicaService } from '../evaluacion-heuristica.service.js';
import { HeuristicaEvidenciaService } from '../heuristica-evidencia.service.js';
import { detectarMimeImagen } from '../evidencia.util.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);

describe('detectarMimeImagen', () => {
  it('reconoce PNG, JPEG y WebP por magic bytes', () => {
    expect(detectarMimeImagen(PNG)).toBe('image/png');
    expect(detectarMimeImagen(JPG)).toBe('image/jpeg');
    expect(detectarMimeImagen(WEBP)).toBe('image/webp');
  });

  it('rechaza SVG, HTML, GIF y buffers vacíos o truncados', () => {
    expect(detectarMimeImagen(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectarMimeImagen(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectarMimeImagen(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectarMimeImagen(Buffer.alloc(0))).toBeNull();
    expect(detectarMimeImagen(PNG.subarray(0, 4))).toBeNull();
  });
});

describe('HeuristicaEvidenciaService', () => {
  let service: HeuristicaEvidenciaService;
  let prisma: { evidenciaHeuristica: { count: jest.Mock; create: jest.Mock; findFirst: jest.Mock } };
  let heuristica: { obtenerSesion: jest.Mock };
  const user = { id: 'u1', rol: 'DOCENTE', actor: 'EVALUADOR' } as AuthenticatedUser;
  const archivo = (buffer: Buffer) => ({ buffer, size: buffer.length });

  beforeEach(async () => {
    prisma = {
      evidenciaHeuristica: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findFirst: jest.fn() },
    };
    heuristica = { obtenerSesion: jest.fn().mockResolvedValue({ id: 's1', estado: EstadoSesion.EN_PROGRESO }) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HeuristicaEvidenciaService,
        { provide: PrismaService, useValue: prisma },
        { provide: EvaluacionHeuristicaService, useValue: heuristica },
      ],
    }).compile();
    service = moduleRef.get(HeuristicaEvidenciaService);
  });

  it('guarda una imagen válida con el mime detectado, no el declarado', async () => {
    prisma.evidenciaHeuristica.create.mockResolvedValue({ id: 'e1', mimeType: 'image/png' });
    await service.subir('s1', archivo(PNG), user);
    expect(heuristica.obtenerSesion).toHaveBeenCalledWith('s1', user);
    expect(prisma.evidenciaHeuristica.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sesionId: 's1', subidoPorId: 'u1', mimeType: 'image/png', tamano: PNG.length }),
      }),
    );
  });

  it('415 si el contenido no es PNG/JPEG/WebP (ej. SVG con script)', async () => {
    await expect(
      service.subir('s1', archivo(Buffer.from('<svg onload="alert(1)"/>')), user),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(prisma.evidenciaHeuristica.create).not.toHaveBeenCalled();
  });

  it('400 sin archivo o por encima de 2 MB', async () => {
    await expect(service.subir('s1', undefined, user)).rejects.toBeInstanceOf(BadRequestException);
    const grande = Buffer.concat([PNG, Buffer.alloc(EVIDENCIA_MAX_BYTES)]);
    await expect(service.subir('s1', archivo(grande), user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('409 con sesión cerrada o al alcanzar el máximo por sesión', async () => {
    heuristica.obtenerSesion.mockResolvedValue({ id: 's1', estado: EstadoSesion.COMPLETADO });
    await expect(service.subir('s1', archivo(PNG), user)).rejects.toBeInstanceOf(ConflictException);
    heuristica.obtenerSesion.mockResolvedValue({ id: 's1', estado: EstadoSesion.EN_PROGRESO });
    prisma.evidenciaHeuristica.count.mockResolvedValue(EVIDENCIA_MAX_POR_SESION);
    await expect(service.subir('s1', archivo(PNG), user)).rejects.toBeInstanceOf(ConflictException);
  });

  it('obtener: valida acceso a la sesión y filtra por sesión; 404 si no existe', async () => {
    prisma.evidenciaHeuristica.findFirst.mockResolvedValue({ mimeType: 'image/png', datos: new Uint8Array(PNG) });
    const r = await service.obtener('s1', 'e1', user);
    expect(heuristica.obtenerSesion).toHaveBeenCalledWith('s1', user);
    expect(prisma.evidenciaHeuristica.findFirst).toHaveBeenCalledWith({
      where: { id: 'e1', sesionId: 's1' },
      select: { mimeType: true, datos: true },
    });
    expect(r.mimeType).toBe('image/png');
    expect(Buffer.isBuffer(r.datos)).toBe(true);

    prisma.evidenciaHeuristica.findFirst.mockResolvedValue(null);
    await expect(service.obtener('s1', 'e2', user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
