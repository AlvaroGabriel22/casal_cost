import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { err } from '../api-response';

type PrismaLikeError = {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
};

const FRIENDLY_GENERIC =
  'Não foi possível concluir a operação. Tente novamente em alguns instantes.';
const FRIENDLY_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Não foi possível processar os dados informados. Verifique e tente novamente.',
  [HttpStatus.UNAUTHORIZED]: 'Sua sessão expirou. Faça login novamente para continuar.',
  [HttpStatus.FORBIDDEN]: 'Você não tem permissão para executar esta ação.',
  [HttpStatus.NOT_FOUND]: 'Registro não encontrado.',
  [HttpStatus.CONFLICT]: 'Este registro entra em conflito com um já existente.',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Alguns campos precisam ser revisados antes de continuar.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (
        typeof exResponse === 'object' &&
        exResponse !== null &&
        'success' in (exResponse as Record<string, unknown>)
      ) {
        return res.status(status).json(exResponse);
      }
      if (typeof exResponse === 'object' && exResponse !== null) {
        const r = exResponse as Record<string, unknown>;
        if (Array.isArray(r.message)) {
          message = (r.message as string[]).join(', ');
        } else if (typeof r.message === 'string') {
          message = r.message;
        }
        if (typeof r.error === 'string') {
          code = r.error;
        }
      } else if (typeof exResponse === 'string') {
        message = exResponse;
      }
    } else if (this.isPrismaError(exception)) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status === HttpStatus.UNAUTHORIZED) code = 'UNAUTHORIZED_ACCESS';
    else if (status === HttpStatus.FORBIDDEN) code = 'FORBIDDEN';
    else if (status === HttpStatus.BAD_REQUEST) code = 'BAD_REQUEST';
    else if (status === HttpStatus.NOT_FOUND) code = 'NOT_FOUND';
    else if (status === HttpStatus.CONFLICT) code = 'CONFLICT';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${req?.method ?? 'REQ'} ${req?.url ?? ''} → ${status} ${code} :: ${
          (exception as Error)?.stack ?? (exception as Error)?.message ?? exception
        }`,
      );
      message = FRIENDLY_GENERIC;
    } else if (!message || !message.trim()) {
      message = FRIENDLY_BY_STATUS[status] ?? FRIENDLY_GENERIC;
    }

    return res.status(status).json(err(code, message));
  }

  private isPrismaError(exception: unknown): exception is PrismaLikeError {
    if (!exception || typeof exception !== 'object') return false;
    const e = exception as PrismaLikeError;
    return typeof e.code === 'string' && /^P\d{4}$/.test(e.code);
  }

  private mapPrismaError(error: PrismaLikeError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (error.code) {
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALUE_TOO_LONG',
          message: 'Um dos campos excedeu o tamanho permitido.',
        };
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'UNIQUE_CONSTRAINT',
          message: 'Já existe um registro com estes dados.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_RELATION',
          message: 'Referência inválida entre registros.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'O registro solicitado não foi encontrado.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: FRIENDLY_GENERIC,
        };
    }
  }
}
