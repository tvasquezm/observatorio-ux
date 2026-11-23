import { readFileSync } from 'node:fs';
import { Injectable, NotFoundException } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async buildReport(proyectoId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);

    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        artefactos: {
          where: { deletedAt: null },
          orderBy: [{ tipo: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            tipo: true,
            artefactoLogicoId: true,
            version: true,
            contenido: true,
            autor: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            createdAt: true,
          },
        },
        sesiones: {
          // Exportar no amplía el acceso a hallazgos individuales de otros evaluadores.
          where: user.rol === 'ADMIN' ? {} : {
            OR: [
              { evaluadorId: user.id },
              { tipo: 'CARD_SORTING', estudio: { evaluadorId: user.id } },
              ...(user.rol === 'DOCENTE' ? [{
                tipo: 'CARD_SORTING' as const,
                proyecto: { sala: { profesorId: user.id } },
              }] : []),
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nombre: true,
            tipo: true,
            estado: true,
            actor: true,
            resultado: true,
            tipoCardSorting: true,
            cerrado: true,
            createdAt: true,
            completadoAt: true,
            estudioId: true,
            cardsDefinidas: { select: { id: true, etiqueta: true } },
            categoriasDefinidas: { select: { id: true, nombre: true, esPredefinida: true } },
            agrupaciones: {
              select: {
                card: { select: { id: true, etiqueta: true } },
                category: { select: { id: true, nombre: true } },
              },
            },
          },
        },
        comentarios: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            texto: true,
            artefactoLogicoId: true,
            createdAt: true,
            updatedAt: true,
            autor: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!proyecto || proyecto.deletedAt) {
      throw new NotFoundException('El proyecto no existe.');
    }

    return {
      generatedAt: new Date().toISOString(),
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion,
        createdAt: proyecto.createdAt,
        creador: proyecto.creadoPor,
      },
      resumen: {
        artefactos: proyecto.artefactos.length,
        sesiones: proyecto.sesiones.length,
        comentarios: proyecto.comentarios.length,
      },
      artefactos: proyecto.artefactos,
      sesiones: proyecto.sesiones,
      comentarios: proyecto.comentarios,
    };
  }

  async generatePdf(proyectoId: string, user: AuthenticatedUser): Promise<Buffer> {
    const report = await this.buildReport(proyectoId, user);

    const fonts = {
      LatinModern: {
        normal: readFileSync(new URL('./fonts/lmroman10-regular.otf', import.meta.url)),
        bold: readFileSync(new URL('./fonts/lmroman10-bold.otf', import.meta.url)),
        italics: readFileSync(new URL('./fonts/lmroman10-italic.otf', import.meta.url)),
        bolditalics: readFileSync(new URL('./fonts/lmroman10-bolditalic.otf', import.meta.url)),
      },
    };

    const printer = new PdfPrinter(fonts);

    const document: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [54, 72, 54, 54],
      header: { text: 'UXLab Observatorio', fontSize: 10, bold: true, color: '#1f2d4a', margin: [54, 28, 54, 0] },
      footer: (page, total) => ({ columns: [
        { text: 'Observatorio UX · Evidencia de investigación', color: '#5c6b7f', fontSize: 8 },
        { text: `${page} / ${total}`, alignment: 'right', color: '#5c6b7f', fontSize: 8 },
      ], margin: [54, 18, 54, 0] }),
      info: {
        title: `Reporte de proyecto - ${report.proyecto.nombre}`,
        author: 'Observatorio UX',
        subject: 'Reporte de proyecto UX',
      },
      content: [
        {
          text: 'Reporte de Proyecto UX',
          style: 'title',
        },
        {
          text: report.proyecto.nombre,
          style: 'projectName',
        },
        {
          text: report.proyecto.descripcion || 'Sin descripción registrada.',
          style: 'description',
          margin: [0, 0, 0, 16],
        },

        {
          text: 'Información general',
          style: 'section',
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Creado por', report.proyecto.creador.nombre],
              ['Correo', report.proyecto.creador.email],
              ['Fecha de creación', this.formatDate(report.proyecto.createdAt)],
              ['Artefactos', String(report.resumen.artefactos)],
              ['Sesiones', String(report.resumen.sesiones)],
              ['Comentarios', String(report.resumen.comentarios)],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 18],
        },

        {
          text: 'Artefactos UX',
          style: 'section',
        },
        ...this.buildArtifactsContent(report.artefactos),

        {
          text: 'Sesiones de investigación',
          style: 'section',
        },
        ...this.buildSessionsContent(report.sesiones),

        {
          text: 'Comentarios y retroalimentación',
          style: 'section',
        },
        ...this.buildCommentsContent(report.comentarios),
      ],
      styles: {
        title: {
          fontSize: 9,
          bold: true,
          color: '#3049b2',
          characterSpacing: 1,
          margin: [0, 12, 0, 12],
        },
        projectName: {
          font: 'LatinModern',
          fontSize: 25,
          alignment: 'center',
          bold: true,
          margin: [0, 0, 0, 16],
        },
        description: {
          fontSize: 10,
          color: '#5c6b7f',
        },
        section: {
          font: 'LatinModern',
          fontSize: 20,
          bold: true,
          margin: [0, 24, 0, 12],
        },
        subsection: {
          font: 'LatinModern',
          fontSize: 15,
          bold: true,
          margin: [0, 18, 0, 8],
        },
        body: {
          fontSize: 10.5,
        },
        dataLabel: { fontSize: 8.5, bold: true, color: '#5c6b7f', margin: [0, 3, 0, 3] },
        small: {
          fontSize: 8,
          color: '#5c6b7f',
        },
      },
      defaultStyle: {
        font: 'LatinModern',
        fontSize: 11,
        lineHeight: 1.18,
        color: '#222222',
      },
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const pdf = printer.createPdfKitDocument(document);
        const chunks: Buffer[] = [];

        pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdf.on('end', () => resolve(Buffer.concat(chunks)));
        pdf.on('error', reject);

        pdf.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildArtifactsContent(artefactos: ProjectReport['artefactos']): Content[] {
    if (artefactos.length === 0) {
      return [
        {
          text: 'No hay artefactos UX registrados.',
          style: 'body',
        },
      ];
    }

    return artefactos.flatMap((artefacto, index) => [
      {
        text: `${index + 1}. ${String(artefacto.tipo)}`,
        style: 'subsection',
      },
      {
        text: [
          `Versión: ${artefacto.version}`,
          `Autor: ${artefacto.autor.nombre}`,
          `Fecha: ${this.formatDate(artefacto.createdAt)}`,
          `ID lógico: ${artefacto.artefactoLogicoId}`,
        ].join(' | '),
        style: 'small',
      },
      ...this.buildDataContent(artefacto.contenido),
    ]);
  }

  private buildSessionsContent(sesiones: ProjectReport['sesiones']): Content[] {
    if (sesiones.length === 0) {
      return [
        {
          text: 'No hay sesiones de investigación registradas.',
          style: 'body',
        },
      ];
    }

    return sesiones.flatMap((sesion, index) => [
      {
        text: `${index + 1}. ${sesion.nombre}`,
        style: 'subsection',
      },
      {
        text: [
          `Tipo: ${String(sesion.tipo)}`,
          `Estado: ${String(sesion.estado)}`,
          `Actor: ${String(sesion.actor)}`,
          `Creada: ${this.formatDate(sesion.createdAt)}`,
          sesion.completadoAt
            ? `Completada: ${this.formatDate(sesion.completadoAt)}`
            : 'Sin fecha de finalización',
        ].join(' | '),
        style: 'small',
      },
      ...(sesion.resultado
        ? [
            ...this.buildDataContent(sesion.resultado),
          ]
        : [
            {
              text: 'Sin resultado registrado.',
              style: 'body',
              margin: [0, 3, 0, 10],
            } as Content,
          ]),
      ...(sesion.tipo === 'CARD_SORTING' ? this.buildDataContent({
          tarjetas: sesion.cardsDefinidas,
          categorias: sesion.categoriasDefinidas,
          agrupaciones: sesion.agrupaciones,
        }) : []),
    ]);
  }

  private buildCommentsContent(comentarios: ProjectReport['comentarios']): Content[] {
    if (comentarios.length === 0) {
      return [
        {
          text: 'No hay comentarios registrados.',
          style: 'body',
        },
      ];
    }

    return comentarios.flatMap((comentario, index) => [
      {
        text: `${index + 1}. ${comentario.autor.nombre}`,
        style: 'subsection',
      },
      {
        text: comentario.texto,
        style: 'body',
      },
      {
        text: [
          `Fecha: ${this.formatDate(comentario.createdAt)}`,
          comentario.artefactoLogicoId
            ? `Artefacto relacionado: ${comentario.artefactoLogicoId}`
            : 'Comentario general del proyecto',
        ].join(' | '),
        style: 'small',
        margin: [0, 3, 0, 8],
      },
    ]);
  }

  private buildDataContent(value: unknown): Content[] {
    if (Array.isArray(value)) {
      return value.length ? value.flatMap((item, index): Content[] => [
        ...(typeof item === 'object' && item !== null ? [{ text: `Registro ${index + 1}`, style: 'dataLabel' } as Content] : []),
        ...this.buildDataContent(item),
      ]) : [{ text: 'Sin registros.', style: 'small', margin: [0, 0, 0, 8] }];
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([key, item]): Content => ({
        stack: [
          { text: key.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2').replace(/_/g, ' ').toLocaleLowerCase('es'), style: 'dataLabel' },
          ...this.buildDataContent(item),
        ], margin: [12, 0, 0, 4],
      }));
    }
    return [{ text: value == null || value === '' ? 'Sin información.' : String(value), style: 'body', margin: [0, 0, 0, 8] }];
  }

  private formatDate(value: Date | string): string {
    return new Date(value).toLocaleString('es-CL');
  }
}

type ProjectReport = Awaited<ReturnType<ReportsService['buildReport']>>;
