import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Filtro catch-all: sin esto, cada excepción de Nest devuelve un JSON con
 * forma distinta (a veces {message}, a veces {message, error, statusCode}),
 * y cualquier error NO controlado (ej. un bug en el código) devuelve un
 * stack trace de Express directo al cliente. Este filtro garantiza que
 * TODA respuesta de error tenga siempre la misma forma, y que los errores
 * inesperados (500) nunca filtren detalles internos.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttpException ? exception.getResponse() : null;

    // class-validator (ValidationPipe) devuelve { message: string[] },
    // el resto de las HttpException de Nest devuelven { message: string }.
    const message =
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse
        ? (errorResponse as { message: string | string[] }).message
        : isHttpException
          ? exception.message
          : 'Error interno del servidor';

    const body: ErrorResponseBody = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // Los 500 (errores no anticipados) se loggean con el stack completo del
    // lado del servidor. Los 4xx (errores "esperables": 401, 403, 404, 409,
    // validaciones) no se loggean como error: son parte normal del tráfico.
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → 500`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }
}
