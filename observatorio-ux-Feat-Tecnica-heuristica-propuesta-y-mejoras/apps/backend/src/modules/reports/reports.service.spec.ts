import { ForbiddenException, NotFoundException } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';
import { ReportsService } from './reports.service.js';

describe('ReportsService', () => {
  const user: AuthenticatedUser = { id: 'owner', actor: 'EVALUADOR', rol: 'ESTUDIANTE' };
  const findUnique = jest.fn();
  const assertAccess = jest.fn();
  const service = new ReportsService(
    { proyecto: { findUnique } } as unknown as PrismaService,
    { assertAccess } as unknown as ProjectAccessService,
  );
  const project = {
    id: 'p1', nombre: 'Investigación e inclusión', descripcion: null,
    createdAt: new Date('2026-09-15'), deletedAt: null,
    creadoPor: { id: 'owner', nombre: 'José', email: 'test@example.com' },
    artefactos: [], sesiones: [], comentarios: [],
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    findUnique.mockResolvedValue(project);
  });

  it('genera un PDF real con las fuentes incluidas en la dependencia', async () => {
    const pdf = await service.generatePdf('p1', user);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.subarray(-20).toString()).toContain('%%EOF');
  });

  it('rechaza el acceso al proyecto antes de consultar datos para JSON o PDF', async () => {
    assertAccess.mockRejectedValue(new ForbiddenException());
    await expect(service.buildReport('p1', user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.generatePdf('p1', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each(['ESTUDIANTE', 'DOCENTE'] as const)('limita las sesiones exportadas para %s', async (rol) => {
    await service.buildReport('p1', { ...user, rol });
    const sessions = findUnique.mock.calls[0][0].include.sesiones;
    expect(sessions.where.OR).toContainEqual({ evaluadorId: user.id });
    expect(sessions.where.OR).toContainEqual({ tipo: 'CARD_SORTING', estudio: { evaluadorId: user.id } });
    expect(sessions.where.OR).not.toContainEqual({});
    if (rol === 'DOCENTE') {
      expect(sessions.where.OR).toContainEqual({ tipo: 'CARD_SORTING', proyecto: { sala: { profesorId: user.id } } });
    } else {
      expect(sessions.where.OR).toHaveLength(2);
    }
  });

  it('permite al ADMIN exportar todas las sesiones del proyecto', async () => {
    await service.buildReport('p1', { ...user, rol: 'ADMIN' });
    expect(findUnique.mock.calls[0][0].include.sesiones.where).toEqual({});
  });

  it('incluye las tarjetas, categorías y agrupaciones de Card Sorting en JSON y PDF', async () => {
    const session = {
      id: 's1', nombre: 'Estudio', tipo: 'CARD_SORTING', actor: 'PARTICIPANTE',
      estado: 'COMPLETADO', createdAt: project.createdAt, completadoAt: null,
      estudioId: 'study', resultado: null,
      cardsDefinidas: [{ id: 'card', etiqueta: 'Contacto' }],
      categoriasDefinidas: [{ id: 'category', nombre: 'Ayuda', esPredefinida: true }],
      agrupaciones: [{ card: { id: 'card', etiqueta: 'Contacto' }, category: { id: 'category', nombre: 'Ayuda' } }],
    };
    findUnique.mockResolvedValue({ ...project, sesiones: [session] });
    const report = await service.buildReport('p1', user);
    expect(report.sesiones).toEqual([session]);
    const select = findUnique.mock.calls[0][0].include.sesiones.select;
    for (const field of ['estudioId', 'cardsDefinidas', 'categoriasDefinidas', 'agrupaciones']) expect(select[field]).toBeTruthy();
    const printer = jest.spyOn(PdfPrinter.prototype, 'createPdfKitDocument');
    await service.generatePdf('p1', user);
    const content = JSON.stringify(printer.mock.calls[0][0].content);
    expect(content).toContain('Contacto');
    expect(content).toContain('Ayuda');
  });

  it.each([null, { ...project, deletedAt: new Date() }])('no exporta un proyecto inexistente o eliminado', async (value) => {
    findUnique.mockResolvedValue(value);
    await expect(service.buildReport('p1', user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
