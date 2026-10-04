import { Injectable, NotFoundException } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PrismaService } from '../../core/database/prisma.service';
import { ProjectAccessService } from '../../core/access/project-access.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';

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

    const vfs: Record<string, string> = require('pdfmake/build/vfs_fonts');
    const fonts = {
      Roboto: {
        normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
        italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
        bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
      },
    };

    const printer = new PdfPrinter(fonts);

    const document: TDocumentDefinitions = {
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
          pageBreak: report.artefactos.length > 0 ? 'before' : undefined,
        },
        ...this.buildSessionsContent(report.sesiones),

        {
          text: 'Comentarios y retroalimentación',
          style: 'section',
          pageBreak: report.sesiones.length > 0 ? 'before' : undefined,
        },
        ...this.buildCommentsContent(report.comentarios),
      ],
      styles: {
        title: {
          fontSize: 22,
          bold: true,
          margin: [0, 0, 0, 8],
        },
        projectName: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 8],
        },
        description: {
          fontSize: 10,
          color: '#555555',
        },
        section: {
          fontSize: 15,
          bold: true,
          margin: [0, 16, 0, 10],
        },
        subsection: {
          fontSize: 11,
          bold: true,
          margin: [0, 8, 0, 5],
        },
        body: {
          fontSize: 9,
        },
        small: {
          fontSize: 8,
          color: '#555555',
        },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
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
      {
        text: this.stringifyJson(artefacto.contenido),
        style: 'body',
        margin: [0, 3, 0, 10],
      },
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
            {
              text: this.stringifyJson(sesion.resultado),
              style: 'body',
              margin: [0, 3, 0, 10],
            } as Content,
          ]
        : [
            {
              text: 'Sin resultado registrado.',
              style: 'body',
              margin: [0, 3, 0, 10],
            } as Content,
          ]),
      ...(sesion.tipo === 'CARD_SORTING' ? [{
        text: this.stringifyJson({
          tarjetas: sesion.cardsDefinidas,
          categorias: sesion.categoriasDefinidas,
          agrupaciones: sesion.agrupaciones,
        }),
        style: 'body',
        margin: [0, 3, 0, 10],
      } as Content] : []),
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

  private stringifyJson(value: unknown): string {
    if (value === null || value === undefined) {
      return 'Sin información.';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private formatDate(value: Date | string): string {
    return new Date(value).toLocaleString('es-CL');
  }
}

type ProjectReport = Awaited<ReturnType<ReportsService['buildReport']>>;
