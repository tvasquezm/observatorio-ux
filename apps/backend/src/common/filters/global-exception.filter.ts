import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

// Formato plano acordado — sin envoltorio { data } / { error }.
// message puede venir como string (excepciones manuales) o string[]
// (ValidationPipe de class-validator: whitelist/transform/forbidNonWhitelisted
// ya están activos en main.ts y generan un array de mensajes por campo).
interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  errorCode: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, errorCode } = this.resolve(exception);

    const body: ErrorResponseBody = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      errorCode,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `[${errorCode}] ${request.method} ${request.url} -> ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${errorCode}] ${request.method} ${request.url} -> ${JSON.stringify(message)}`);
    }

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): { statusCode: number; message: string | string[]; errorCode: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      // ValidationPipe devuelve { statusCode, message: string[], error: 'Bad Request' }
      // como getResponse() — este branch cubre tanto eso como HttpException simples.
      const message = typeof res === 'string' ? res : (res as any).message ?? exception.message;
      return { statusCode: status, message, errorCode: this.codeFor(status) };
    }

    // Prisma no lanza HttpException — lo mapeamos a algo entendible.
    // (Este es justo el tipo de error que hoy se veía como 500 crudo, ej. P2022.)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Recurso no encontrado.', errorCode: 'NOT_FOUND' };
      }
      if (exception.code === 'P2002') {
        return { statusCode: HttpStatus.CONFLICT, message: 'Registro duplicado.', errorCode: 'CONFLICT' };
      }
      // Otros códigos (ej. columna faltante) caen al genérico de abajo,
      // pero el stack completo queda igual visible en el log de arriba.
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor.',
      errorCode: 'INTERNAL_ERROR',
    };
  }

  private codeFor(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST: return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED: return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN: return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND: return 'NOT_FOUND';
      case HttpStatus.CONFLICT: return 'CONFLICT';
      default: return status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR';
    }
  }
}
